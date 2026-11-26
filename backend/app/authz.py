from functools import wraps
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask import jsonify
from .models import User
from .extensions import db


def current_user():
    return db.session.get(User, int(get_jwt_identity()))


def roles_required(*allowed):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user = current_user()
            if not user or user.role not in allowed:
                return jsonify(error='Access denied'), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
