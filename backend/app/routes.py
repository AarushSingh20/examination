from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from sqlalchemy import func
from .extensions import db
from .models import User, Course, Enrollment, Exam, ExamInvitation, Availability, ExamSlot, Booking, Question, Submission, utcnow
from .authz import roles_required, current_user

api = Blueprint('routes', __name__)


def payload():
    return request.get_json(silent=True) or {}


def fail(message, status=400):
    return jsonify(error=message), status


def required(data, *keys):
    return all(data.get(key) is not None and str(data[key]).strip() for key in keys)


def positive_int(value):
    try:
        n = int(value)
        return n if n > 0 else None
    except (ValueError, TypeError):
        return None


def iso_utc(value):
    try:
        dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
        if dt.tzinfo is None:
            raise ValueError('Timezone required')
        from datetime import timezone
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    except (AttributeError, TypeError, ValueError, OverflowError):
        return None

@api.post('/auth/register')
def register():
    d = payload()
    if not required(d, 'name', 'email', 'password'):
        return fail('Name, email and password required')
    email = str(d['email']).strip().lower()
    password = str(d['password'])
    if '@' not in email or len(password) < 8:
        return fail('Valid email and password (minimum 8 characters) required')
    if User.query.filter_by(email=email).first():
        return fail('Email already registered', 409)
    user = User(name=str(d['name']).strip(), email=email, role='student')
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify(user=user.to_dict(), access_token=create_access_token(identity=str(user.id))), 201

@api.post('/auth/login')
def login():
    d = payload()
    email = str(d.get('email', '')).strip().lower()
    user = User.query.filter_by(email=email).first()
    if not user or not user.verify_password(str(d.get('password', ''))):
        return fail('Invalid email or password', 401)
    return jsonify(user=user.to_dict(), access_token=create_access_token(identity=str(user.id)))

@api.get('/auth/me')
@roles_required('admin', 'examiner', 'student')
def me():
    return jsonify(current_user().to_dict())

@api.get('/dashboard')
@roles_required('admin', 'examiner', 'student')
def dashboard():
    u = current_user()
    if u.role == 'admin':
        return jsonify(stats={'Students': User.query.filter_by(role='student').count(), 'Examiners': User.query.filter_by(role='examiner').count(),
                              'Courses': Course.query.count(), 'Exams': Exam.query.count(), 'Bookings': Booking.query.count()},
                       recent_exams=[e.to_dict() for e in Exam.query.order_by(Exam.id.desc()).limit(6)])
    if u.role == 'examiner':
        exams = Exam.query.filter_by(examiner_id=u.id).all()
        ids = [e.id for e in exams]
        return jsonify(stats={'Assigned exams': len(exams), 'Published exams': sum(e.status == 'published' for e in exams),
                              'Questions': Question.query.filter(Question.exam_id.in_(ids)).count() if ids else 0,
                              'Availability': Availability.query.filter_by(examiner_id=u.id).count()},
                       recent_exams=[e.to_dict() for e in exams[:6]])
    bookings = Booking.query.filter_by(student_id=u.id).all()
    results = Submission.query.join(Booking).filter(Booking.student_id == u.id).all()
    return jsonify(stats={'Courses': Enrollment.query.filter_by(student_id=u.id).count(),
                          'Bookings': len(bookings), 'Completed': len(results),
                          'Available exams': Exam.query.filter_by(status='published').count()},
                   bookings=[b.to_dict() for b in bookings[:6]], results=[r.to_dict() for r in results[:6]])

@api.get('/users')
@roles_required('admin')
def list_users():
    return jsonify([u.to_dict() for u in User.query.order_by(User.id.desc()).all()])

@api.post('/users/examiners')
@roles_required('admin')
def create_examiner():
    d = payload()
    if not required(d, 'name', 'email', 'password') or len(str(d.get('password', ''))) < 8:
        return fail('Name, email, password (minimum 8 characters) required')
    email = str(d['email']).strip().lower()
    if '@' not in email:
        return fail('Valid email required')
    if User.query.filter_by(email=email).first():
        return fail('Email already registered', 409)
    u = User(name=str(d['name']).strip(), email=email, role='examiner')
    u.set_password(str(d['password']))
    db.session.add(u)
    db.session.commit()
    return jsonify(u.to_dict()), 201

@api.get('/courses')
@roles_required('admin', 'examiner', 'student')
def courses():
    return jsonify([c.to_dict() for c in Course.query.order_by(Course.code).all()])

@api.post('/courses')
@roles_required('admin')
def create_course():
    d = payload()
    if not required(d, 'code', 'title'):
        return fail('Course code and title required')
    c = Course(code=str(d['code']).strip().upper(), title=str(d['title']).strip(), description=str(d.get('description', '')))
    db.session.add(c)
    db.session.commit()
    return jsonify(c.to_dict()), 201

@api.put('/courses/<int:course_id>')
@roles_required('admin')
def update_course(course_id):
    c = db.session.get(Course, course_id)
    if not c:
        return fail('Course not found', 404)
    d = payload()
    for field in ('code', 'title', 'description'):
        if field in d:
            setattr(c, field, str(d[field]).strip())
    if not c.code or not c.title:
        return fail('Code and title cannot be empty')
    db.session.commit()
    return jsonify(c.to_dict())

@api.delete('/courses/<int:course_id>')
@roles_required('admin')
def delete_course(course_id):
    c = db.session.get(Course, course_id)
    if not c:
        return fail('Course not found', 404)
    if Exam.query.filter_by(course_id=c.id).first() or Enrollment.query.filter_by(course_id=c.id).first():
        return fail('Course has exams or enrollments; remove dependencies first', 409)
    db.session.delete(c)
    db.session.commit()
    return '', 204

@api.post('/enrollments')
@roles_required('admin', 'student')
def enroll():
    d = payload()
    u = current_user()
    course_id = positive_int(d.get('course_id'))
    student_id = positive_int(d.get('student_id')) if u.role == 'admin' else u.id
    if not course_id or not db.session.get(Course, course_id):
        return fail('Valid course required')
    student = db.session.get(User, student_id) if student_id else None
    if not student or student.role != 'student':
        return fail('Valid student required')
    if Enrollment.query.filter_by(student_id=student_id, course_id=course_id).first():
        return fail('Already enrolled', 409)
    db.session.add(Enrollment(student_id=student_id, course_id=course_id))
    db.session.commit()
    return jsonify(message='Enrollment created'), 201

@api.get('/enrollments/me')
@roles_required('student')
def my_enrollments():
    course_ids = [e.course_id for e in Enrollment.query.filter_by(student_id=current_user().id)]
    return jsonify([c.to_dict() for c in Course.query.filter(Course.id.in_(course_ids)).all()])

@api.get('/exams')
@roles_required('admin', 'examiner', 'student')
def exams():
    u = current_user()
    q = Exam.query
    if u.role == 'examiner':
        q = q.filter_by(examiner_id=u.id)
    elif u.role == 'student':
        enrolled = db.session.query(Enrollment.course_id).filter_by(student_id=u.id)
        q = q.filter(Exam.status == 'published', Exam.course_id.in_(enrolled))
    return jsonify([e.to_dict() for e in q.order_by(Exam.id.desc()).all()])

@api.post('/exams')
@roles_required('admin')
def create_exam():
    d = payload()
    if not required(d, 'title', 'course_id'):
        return fail('Title and course required')
    course = db.session.get(Course, positive_int(d['course_id']))
    duration = positive_int(d.get('duration_minutes', 60))
    marks = positive_int(d.get('total_marks', 100))
    if not course or not duration or not marks:
        return fail('Invalid course, duration or marks')

    examiner_id = None
    requested_id = d.get('examiner_id')
    if requested_id not in (None, ''):
        raw_id = str(requested_id)
        if len(raw_id) > 10 or not raw_id.isascii() or not raw_id.isdecimal():
            return fail('Invalid examiner')
        examiner = db.session.get(User, int(raw_id))
        if examiner is None or examiner.role != 'examiner':
            return fail('Invalid examiner')
        examiner_id = examiner.id

    e = Exam(title=str(d['title']).strip(), course_id=course.id,
             examiner_id=examiner_id, duration_minutes=duration, total_marks=marks)
    db.session.add(e)
    db.session.commit()
    return jsonify(e.to_dict()), 201

@api.patch('/exams/<int:exam_id>/status')
@roles_required('admin')
def change_status(exam_id):
    e = db.session.get(Exam, exam_id)
    if not e:
        return fail('Exam not found', 404)
    status = payload().get('status')
    if status not in ('draft', 'published', 'closed'):
        return fail('Invalid status')
    if status == 'published' and e.examiner_id is None:
        return fail('Assign an examiner before publishing')
    if status == 'published' and not Question.query.filter_by(exam_id=e.id).first():
        return fail('Add at least one question before publishing')
    e.status = status
    db.session.commit()
    return jsonify(e.to_dict())

@api.get('/availability')
@roles_required('admin', 'examiner')
def availability():
    u = current_user()
    q = Availability.query if u.role == 'admin' else Availability.query.filter_by(examiner_id=u.id)
    return jsonify([a.to_dict() for a in q.order_by(Availability.starts_at.desc()).all()])

@api.post('/availability')
@roles_required('examiner')
def create_availability():
    d = payload()
    start, end = iso_utc(d.get('starts_at')), iso_utc(d.get('ends_at'))
    if not start or not end or start >= end or start <= utcnow():
        return fail('Valid future UTC start/end required (ISO 8601 with timezone)')
    a = Availability(examiner_id=current_user().id, starts_at=start, ends_at=end)
    db.session.add(a)
    db.session.commit()
    return jsonify(a.to_dict()), 201

@api.get('/slots')
@roles_required('admin', 'examiner', 'student')
def slots():
    u = current_user()
    q = ExamSlot.query.join(Exam)
    if u.role == 'examiner':
        q = q.filter(Exam.examiner_id == u.id)
    elif u.role == 'student':
        enrolled = db.session.query(Enrollment.course_id).filter_by(student_id=u.id)
        q = q.filter(Exam.status == 'published', Exam.course_id.in_(enrolled), ExamSlot.starts_at > utcnow())
    return jsonify([s.to_dict() for s in q.order_by(ExamSlot.starts_at).all()])

@api.post('/slots')
@roles_required('admin')
def create_slot():
    d = payload()
    e = db.session.get(Exam, positive_int(d.get('exam_id')))
    starts = iso_utc(d.get('starts_at'))
    capacity = positive_int(d.get('capacity'))
    if not e or not starts or starts <= utcnow() or not capacity:
        return fail('Valid exam, future start (with timezone), capacity required')
    if e.examiner_id is None:
        return fail('Assign an examiner before scheduling a slot')
    # If examiner has published availability, slot must fit one of their windows.
    windows = Availability.query.filter_by(examiner_id=e.examiner_id).all()
    from datetime import timedelta
    if windows and not any(a.starts_at <= starts and starts + timedelta(minutes=e.duration_minutes) <= a.ends_at for a in windows):
        return fail('Slot must fit examiner availability')
    s = ExamSlot(exam_id=e.id, starts_at=starts, capacity=capacity)
    db.session.add(s)
    db.session.commit()
    return jsonify(s.to_dict()), 201

@api.get('/bookings')
@roles_required('admin', 'examiner', 'student')
def bookings():
    u = current_user()
    q = Booking.query
    if u.role == 'student':
        q = q.filter_by(student_id=u.id)
    elif u.role == 'examiner':
        q = q.join(ExamSlot).join(Exam).filter(Exam.examiner_id == u.id)
    return jsonify([b.to_dict() for b in q.order_by(Booking.id.desc()).all()])

@api.post('/bookings')
@roles_required('student')
def create_booking():
    slot_id = positive_int(payload().get('slot_id'))
    if not slot_id:
        return fail('Slot required')
    # Serialize booking attempts on the slot row under PostgreSQL.
    slot = db.session.query(ExamSlot).filter_by(id=slot_id).with_for_update().first()
    if not slot or slot.exam.status != 'published' or slot.starts_at <= utcnow():
        db.session.rollback()
        return fail('Slot unavailable', 404)
    u = current_user()
    if not Enrollment.query.filter_by(student_id=u.id, course_id=slot.exam.course_id).first():
        db.session.rollback()
        return fail('Enroll in the course first', 403)
    if Booking.query.filter_by(student_id=u.id, slot_id=slot.id).first():
        db.session.rollback()
        return fail('Already booked', 409)
    if Booking.query.filter_by(slot_id=slot.id).count() >= slot.capacity:
        db.session.rollback()
        return fail('Slot is full', 409)
    # One booking per exam, even when multiple slots exist.
    already = Booking.query.join(ExamSlot).filter(Booking.student_id == u.id, ExamSlot.exam_id == slot.exam_id).first()
    if already:
        db.session.rollback()
        return fail('You already booked this exam', 409)
    b = Booking(slot_id=slot.id, student_id=u.id)
    db.session.add(b)
    db.session.commit()
    return jsonify(b.to_dict()), 201

@api.get('/exams/<int:exam_id>/questions')
@roles_required('admin', 'examiner', 'student')
def questions(exam_id):
    e = db.session.get(Exam, exam_id)
    if not e:
        return fail('Exam not found', 404)
    u = current_user()
    if u.role == 'examiner' and e.examiner_id != u.id:
        return fail('Access denied', 403)
    if u.role == 'student':
        if e.status != 'published':
            return fail('Exam not available', 403)
        booked = Booking.query.join(ExamSlot).filter(Booking.student_id == u.id, ExamSlot.exam_id == e.id).first()
        if not booked:
            return fail('Book exam first', 403)
        if utcnow() < booked.slot.starts_at or utcnow() > booked.slot.starts_at + __import__('datetime').timedelta(minutes=e.duration_minutes):
            return fail('Exam can only be attempted during the booked time window', 403)
    return jsonify([q.to_dict(include_answer=u.role != 'student') for q in Question.query.filter_by(exam_id=e.id).all()])

@api.post('/exams/<int:exam_id>/questions')
@roles_required('admin', 'examiner')
def add_question(exam_id):
    e = db.session.get(Exam, exam_id)
    if not e:
        return fail('Exam not found', 404)
    u = current_user()
    if u.role == 'examiner' and e.examiner_id != u.id:
        return fail('Access denied', 403)
    if e.status != 'draft':
        return fail('Only draft exams can be edited', 409)
    d = payload()
    options = d.get('options')
    index = d.get('correct_index')
    marks = positive_int(d.get('marks', 1))
    if not isinstance(options, list) or len(options) < 2 or len(options) > 6 or not all(isinstance(o, str) and o.strip() for o in options):
        return fail('Provide 2 to 6 non-empty options')
    if type(index) is not int or not 0 <= index < len(options) or not required(d, 'prompt') or not marks:
        return fail('Invalid prompt, correct option index or marks')
    q = Question(exam_id=e.id, prompt=str(d['prompt']).strip(), options=options, correct_index=index, marks=marks)
    db.session.add(q)
    db.session.commit()
    return jsonify(q.to_dict(include_answer=True)), 201

@api.post('/bookings/<int:booking_id>/submit')
@roles_required('student')
def submit(booking_id):
    # Lock booking to avoid racing duplicate submissions.
    b = Booking.query.filter_by(id=booking_id, student_id=current_user().id).with_for_update().first()
    if not b:
        return fail('Booking not found', 404)
    if Submission.query.filter_by(booking_id=b.id).first():
        return fail('Already submitted', 409)
    from datetime import timedelta
    now = utcnow()
    if not b.slot.starts_at <= now <= b.slot.starts_at + timedelta(minutes=b.slot.exam.duration_minutes):
        return fail('Exam submission is outside the scheduled time window', 403)
    answers = payload().get('answers')
    if not isinstance(answers, dict):
        return fail('Answers must be an object keyed by question ID')
    questions = Question.query.filter_by(exam_id=b.slot.exam_id).all()
    score = sum(q.marks for q in questions if type(answers.get(str(q.id))) is int and answers[str(q.id)] == q.correct_index)
    max_score = sum(q.marks for q in questions)
    submission = Submission(booking_id=b.id, answers=answers, score=score, max_score=max_score)
    db.session.add(submission)
    db.session.commit()
    return jsonify(submission.to_dict()), 201

@api.get('/results')
@roles_required('admin', 'examiner', 'student')
def results():
    u = current_user()
    q = Submission.query.join(Booking).join(ExamSlot).join(Exam)
    if u.role == 'student':
        q = q.filter(Booking.student_id == u.id)
    elif u.role == 'examiner':
        q = q.filter(Exam.examiner_id == u.id)
    return jsonify([s.to_dict() for s in q.order_by(Submission.id.desc()).all()])


def examiner_has_conflict(examiner_id, start, end):
    accepted = ExamInvitation.query.filter(
        ExamInvitation.examiner_id == examiner_id,
        ExamInvitation.status == 'ACCEPTED',
        ExamInvitation.starts_at < end,
        ExamInvitation.ends_at > start,
    ).first()
    if accepted is not None:
        return True

    # Slots made by the original scheduling workflow have no invitation.
    slots = db.session.query(ExamSlot.starts_at, Exam.duration_minutes).join(
        Exam, Exam.id == ExamSlot.exam_id
    ).filter(Exam.examiner_id == examiner_id, ExamSlot.starts_at < end)
    return any(start - slot_start < timedelta(minutes=minutes) for slot_start, minutes in slots)


@api.post('/exams/<int:exam_id>/invitations')
@roles_required('admin')
def send_invitation(exam_id):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return fail('Provide an examiner_id and starts_at in a JSON object')

    raw_id = str(data.get('examiner_id', ''))
    if not (0 < len(raw_id) <= 10 and raw_id.isascii() and raw_id.isdecimal()):
        return fail('Select a valid examiner')
    examiner_id = int(raw_id)
    if not 1 <= examiner_id <= 2147483647:
        return fail('Select a valid examiner')

    exam = Exam.query.filter_by(id=exam_id).with_for_update().first()
    if exam is None:
        return fail('Exam not found', 404)
    if exam.status != 'draft' or exam.examiner_id is not None:
        return fail('Invitations require an unassigned draft exam', 409)

    examiner = db.session.get(User, examiner_id)
    if examiner is None or examiner.role != 'examiner':
        return fail('Select a valid examiner')

    now = utcnow()
    start = iso_utc(data.get('starts_at'))
    if start is None or start <= now:
        return fail('Choose a future start time with a timezone')
    try:
        end = start + timedelta(minutes=exam.duration_minutes)
    except OverflowError:
        return fail('Exam end time is out of range')

    window = Availability.query.filter(
        Availability.examiner_id == examiner_id,
        Availability.starts_at <= start,
        Availability.ends_at >= end,
    ).first()
    if window is None:
        return fail('Examiner availability must cover the full exam', 409)
    if examiner_has_conflict(examiner_id, start, end):
        return fail('Examiner already has an overlapping assignment', 409)

    pending = ExamInvitation.query.filter_by(
        exam_id=exam.id, examiner_id=examiner_id, status='PENDING'
    ).first()
    if pending is not None:
        if pending.expires_at > now:
            return fail('A pending invitation already exists for this examiner and exam', 409)
        pending.status = 'EXPIRED'
        db.session.flush()

    invitation = ExamInvitation(
        exam_id=exam.id, examiner_id=examiner_id, invited_by=current_user().id,
        starts_at=start, ends_at=end, expires_at=start, status='PENDING',
    )
    db.session.add(invitation)
    db.session.commit()
    return jsonify(
        id=invitation.id, exam_id=invitation.exam_id, examiner_id=invitation.examiner_id,
        status=invitation.status, starts_at=invitation.starts_at.isoformat() + 'Z',
        ends_at=invitation.ends_at.isoformat() + 'Z',
        expires_at=invitation.expires_at.isoformat() + 'Z',
    ), 201
