import os
from dotenv import load_dotenv
from app import create_app
from app.extensions import db
from app.models import User, Course, Exam, Question

load_dotenv()
app = create_app()
with app.app_context():
    db.create_all()  # local bootstrap; use flask db migrations for subsequent changes
    admin_email = os.getenv('ADMIN_EMAIL', 'admin@examination.local').lower()
    password = os.getenv('ADMIN_PASSWORD', 'ChangeMe123!')
    if len(password) < 8:
        raise ValueError('ADMIN_PASSWORD must be at least 8 characters')
    admin = User.query.filter_by(email=admin_email).first()
    if admin is None:
        admin = User(name='System Administrator', email=admin_email, role='admin')
        admin.set_password(password)
        db.session.add(admin)
    demo_examiner = User.query.filter_by(email='examiner@examination.local').first()
    if demo_examiner is None:
        demo_examiner = User(name='Dr. Aditi Sharma', email='examiner@examination.local', role='examiner')
        demo_examiner.set_password(password)
        db.session.add(demo_examiner)
    db.session.flush()
    course = Course.query.filter_by(code='CS101').first()
    if course is None:
        course = Course(code='CS101', title='Introduction to Computer Science', description='Fundamentals of computing and programming.')
        db.session.add(course)
        db.session.flush()
    exam = Exam.query.filter_by(title='Computer Science Fundamentals').first()
    if exam is None:
        exam = Exam(title='Computer Science Fundamentals', course_id=course.id, examiner_id=demo_examiner.id,
                    duration_minutes=45, total_marks=10, status='published')
        db.session.add(exam)
        db.session.flush()
        db.session.add_all([
            Question(exam_id=exam.id, prompt='Which data structure uses FIFO?', options=['Stack', 'Queue', 'Tree', 'Graph'], correct_index=1, marks=5),
            Question(exam_id=exam.id, prompt='What does CPU stand for?', options=['Central Processing Unit', 'Computer Processing Utility', 'Core Program Unit'], correct_index=0, marks=5)
        ])
    db.session.commit()
    print('Database ready. Admin:', admin_email, '| Demo examiner: examiner@examination.local')
    print('Demo password for both accounts:', password)
