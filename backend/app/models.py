from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from .extensions import db


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(190), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='student', index=True)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    def set_password(self, value):
        self.password_hash = generate_password_hash(value)

    def verify_password(self, value):
        return check_password_hash(self.password_hash, value)

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'email': self.email, 'role': self.role}

class Course(db.Model):
    __tablename__ = 'courses'
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(30), unique=True, nullable=False)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {'id': self.id, 'code': self.code, 'title': self.title, 'description': self.description}

class Enrollment(db.Model):
    __tablename__ = 'enrollments'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    __table_args__ = (db.UniqueConstraint('student_id', 'course_id', name='uq_enrollment'),)

class Exam(db.Model):
    __tablename__ = 'exams'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(180), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    examiner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    duration_minutes = db.Column(db.Integer, nullable=False, default=60)
    total_marks = db.Column(db.Integer, nullable=False, default=100)
    status = db.Column(db.String(20), nullable=False, default='draft')
    created_at = db.Column(db.DateTime, default=utcnow)
    course = db.relationship('Course')
    examiner = db.relationship('User')

    def to_dict(self):
        return {'id': self.id, 'title': self.title, 'course_id': self.course_id,
                'course': self.course.title, 'examiner_id': self.examiner_id,
                'examiner': self.examiner.name if self.examiner else None, 'duration_minutes': self.duration_minutes,
                'total_marks': self.total_marks, 'status': self.status}

class Availability(db.Model):
    __tablename__ = 'examiner_availability'
    id = db.Column(db.Integer, primary_key=True)
    examiner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    starts_at = db.Column(db.DateTime, nullable=False)
    ends_at = db.Column(db.DateTime, nullable=False)
    examiner = db.relationship('User')

    def to_dict(self):
        return {'id': self.id, 'examiner_id': self.examiner_id, 'starts_at': self.starts_at.isoformat()+'Z', 'ends_at': self.ends_at.isoformat()+'Z'}

class ExamSlot(db.Model):
    __tablename__ = 'exam_slots'
    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey('exams.id'), nullable=False)
    starts_at = db.Column(db.DateTime, nullable=False)
    capacity = db.Column(db.Integer, nullable=False, default=30)
    exam = db.relationship('Exam')

    def to_dict(self):
        booked = db.session.query(Booking).filter_by(slot_id=self.id).count()
        return {'id': self.id, 'exam_id': self.exam_id, 'exam': self.exam.title,
                'starts_at': self.starts_at.isoformat()+'Z', 'capacity': self.capacity,
                'booked': booked, 'available': max(0, self.capacity-booked)}

class Booking(db.Model):
    __tablename__ = 'bookings'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    slot_id = db.Column(db.Integer, db.ForeignKey('exam_slots.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)
    slot = db.relationship('ExamSlot')
    student = db.relationship('User')
    __table_args__ = (db.UniqueConstraint('student_id', 'slot_id', name='uq_student_slot'),)

    def to_dict(self):
        return {'id': self.id, 'slot_id': self.slot_id, 'exam_id': self.slot.exam_id,
                'exam': self.slot.exam.title, 'student': self.student.name,
                'starts_at': self.slot.starts_at.isoformat()+'Z'}

class Question(db.Model):
    __tablename__ = 'questions'
    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey('exams.id'), nullable=False)
    prompt = db.Column(db.Text, nullable=False)
    options = db.Column(db.JSON, nullable=False)
    correct_index = db.Column(db.Integer, nullable=False)
    marks = db.Column(db.Integer, nullable=False, default=1)

    def to_dict(self, include_answer=False):
        result = {'id': self.id, 'exam_id': self.exam_id, 'prompt': self.prompt,
                  'options': self.options, 'marks': self.marks}
        if include_answer:
            result['correct_index'] = self.correct_index
        return result

class Submission(db.Model):
    __tablename__ = 'submissions'
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=False, unique=True)
    answers = db.Column(db.JSON, nullable=False)
    score = db.Column(db.Integer, nullable=False)
    max_score = db.Column(db.Integer, nullable=False)
    submitted_at = db.Column(db.DateTime, default=utcnow)
    booking = db.relationship('Booking')