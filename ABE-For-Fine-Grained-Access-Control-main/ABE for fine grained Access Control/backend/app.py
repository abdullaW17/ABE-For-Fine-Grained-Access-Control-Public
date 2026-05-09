from flask import Flask
from flask_cors import CORS
from database import db
from crypto.key_authority import initialize_authority
import bcrypt
import os


def create_admin(app, pk, mk):
    """Create default admin user if none exists"""
    from database import User
    from crypto.key_authority import issue_user_key

    if User.query.filter_by(username='admin').first():
        return

    print("[APP] Creating default admin user...")
    attributes = ['ADMIN']
    password_hash = bcrypt.hashpw(b'admin123', bcrypt.gensalt()).decode()
    sk_bytes = issue_user_key(pk, mk, attributes)

    admin = User(
        username='admin',
        password_hash=password_hash,
        attributes='ADMIN',
        secret_key=sk_bytes,
        is_admin=True
    )
    db.session.add(admin)
    db.session.commit()
    print("[APP] Admin created — username: admin, password: admin123")
    print("[APP] Change this password in production!")


def create_app():
    app = Flask(__name__)
    CORS(app)

    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    import os
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-only-fallback')
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(BASE_DIR, '..', 'abe_platform.db')}"
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['STORAGE_DIR'] = os.path.join(BASE_DIR, '..', 'storage')
    app.config['KEYS_DIR'] = os.path.join(BASE_DIR, '..', 'keys')

    os.makedirs(app.config['STORAGE_DIR'], exist_ok=True)
    os.makedirs(app.config['KEYS_DIR'], exist_ok=True)

    db.init_app(app)

    from routes.auth import auth_bp
    from routes.documents import docs_bp
    from routes.admin import admin_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(docs_bp, url_prefix='/api/documents')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

    with app.app_context():
        db.create_all()
        pk, mk = initialize_authority()
        app.config['ABE_PK'] = pk
        app.config['ABE_MK'] = mk
        create_admin(app, pk, mk)
        print("[APP] ABE authority initialized.")

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)