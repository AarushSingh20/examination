from flask import Flask, jsonify
from sqlalchemy.exc import IntegrityError
from .extensions import db, jwt, migrate, cors
from config import Config

def create_app(config_override=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if config_override:
        app.config.update(config_override)
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app, resources={r'/api/*': {'origins': app.config['FRONTEND_ORIGIN']}})
    from . import models  # register models
    from .routes import api
    app.register_blueprint(api, url_prefix='/api')

    @app.errorhandler(IntegrityError)
    def integrity_error(exc):
        db.session.rollback()
        return jsonify(error='Record conflicts with an existing entry'), 409

    @app.get('/api/health')
    def health():
        return jsonify(status='ok', application='examination')
    return app
