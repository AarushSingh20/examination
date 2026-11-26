import pytest
from datetime import timedelta
from app import create_app
from app.extensions import db
from app.models import User, Course, Exam, ExamSlot, Question, utcnow

@pytest.fixture
def client():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://', 'JWT_SECRET_KEY': 'test-secret'})
    with app.app_context():
        db.create_all()
        admin = User(name='Admin', email='admin@example.com', role='admin'); admin.set_password('Password123')
        examiner = User(name='Teacher', email='teacher@example.com', role='examiner'); examiner.set_password('Password123')
        db.session.add_all([admin, examiner]); db.session.commit()
        yield app.test_client()
        db.session.remove()
        db.drop_all()

def auth(client, email='admin@example.com', password='Password123'):
    return {'Authorization': 'Bearer ' + client.post('/api/auth/login',json={'email':email,'password':password}).json['access_token']}

def test_health_and_role_security(client):
    assert client.get('/api/health').json['status'] == 'ok'
    assert client.post('/api/auth/register',json={'name':'Student','email':'s@example.com','password':'Password123','role':'admin'}).status_code == 201
    student = auth(client,'s@example.com')
    assert client.get('/api/users',headers=student).status_code == 403
    assert client.post('/api/courses',headers=student,json={'code':'CS','title':'Course'}).status_code == 403
    assert client.get('/api/auth/me',headers=student).json['role'] == 'student'

def test_course_exam_slot_booking_and_grade(client):
    admin = auth(client)
    examiner = auth(client,'teacher@example.com')
    registered = client.post('/api/auth/register',json={'name':'Student','email':'student@example.com','password':'Password123'}).json
    student = {'Authorization':'Bearer '+registered['access_token']}
    course = client.post('/api/courses',headers=admin,json={'code':'CS101','title':'Computer Science'}).json
    assert client.post('/api/enrollments',headers=student,json={'course_id':course['id']}).status_code == 201
    with client.application.app_context():
        examiner_id = User.query.filter_by(role='examiner').first().id
    exam = client.post('/api/exams',headers=admin,json={'title':'Midterm','course_id':course['id'],'examiner_id':examiner_id,'duration_minutes':60}).json
    assert client.patch(f"/api/exams/{exam['id']}/status",headers=admin,json={'status':'published'}).status_code == 400
    question = client.post(f"/api/exams/{exam['id']}/questions",headers=examiner,json={'prompt':'1+1?','options':['2','3'],'correct_index':0,'marks':5}).json
    assert 'correct_index' in question
    assert client.patch(f"/api/exams/{exam['id']}/status",headers=admin,json={'status':'published'}).status_code == 200
    start = (utcnow()+timedelta(hours=1)).isoformat()+'Z'
    slot = client.post('/api/slots',headers=admin,json={'exam_id':exam['id'],'starts_at':start,'capacity':1}).json
    assert slot['capacity'] == 1
    booking = client.post('/api/bookings',headers=student,json={'slot_id':slot['id']})
    assert booking.status_code == 201
    assert client.post('/api/bookings',headers=student,json={'slot_id':slot['id']}).status_code == 409
    assert client.get(f"/api/exams/{exam['id']}/questions",headers=student).status_code == 403
    with client.application.app_context():
        s = db.session.get(ExamSlot,slot['id'])
        s.starts_at = utcnow()-timedelta(minutes=1)
        db.session.commit()
    visible = client.get(f"/api/exams/{exam['id']}/questions",headers=student)
    assert visible.status_code == 200
    assert 'correct_index' not in visible.json[0]
    result = client.post(f"/api/bookings/{booking.json['id']}/submit",headers=student,json={'answers':{str(question['id']):0}})
    assert result.status_code == 201
    assert result.json['score'] == 5
    assert client.post(f"/api/bookings/{booking.json['id']}/submit",headers=student,json={'answers':{}}).status_code == 409
    assert client.get('/api/results',headers=student).json[0]['score'] == 5
