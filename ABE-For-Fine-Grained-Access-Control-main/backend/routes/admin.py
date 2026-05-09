from flask import Blueprint, request, jsonify, current_app
from database import db, User, Document
from routes.auth import get_current_user
from crypto.key_authority import issue_user_key
import bcrypt
from functools import wraps

admin_bp = Blueprint('admin', __name__)


def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401
        if not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated


@admin_bp.route('/users', methods=['GET'])
@require_admin
def list_users():
    users = User.query.all()
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'attributes': u.get_attributes(),
        'is_admin': u.is_admin,
        'created_at': u.created_at.isoformat()
    } for u in users])


@admin_bp.route('/users', methods=['POST'])
@require_admin
def create_user():
    """Admin creates a new user and assigns their attributes"""
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    attributes = data.get('attributes', [])

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    if not attributes:
        return jsonify({'error': 'At least one attribute required'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400

    # Hash password
    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    # Clean attributes
    attributes = [a.upper().replace('_', '') for a in attributes]

    # Issue ABE key
    pk = current_app.config['ABE_PK']
    mk = current_app.config['ABE_MK']
    sk_bytes = issue_user_key(pk, mk, attributes)

    user = User(
        username=username,
        password_hash=password_hash,
        attributes=','.join(attributes),
        secret_key=sk_bytes,
        is_admin='ADMIN' in attributes
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({
        'message': f'User {username} created successfully',
        'user': {
            'id': user.id,
            'username': user.username,
            'attributes': attributes,
            'is_admin': user.is_admin
        }
    }), 201


@admin_bp.route('/users/<int:user_id>/attributes', methods=['PUT'])
@require_admin
def update_attributes(user_id):
    """Admin updates a user's attributes and reissues their ABE key"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    new_attributes = [a.upper().replace('_', '') for a in data.get('attributes', [])]

    if not new_attributes:
        return jsonify({'error': 'Attributes required'}), 400

    # Reissue ABE key with new attributes
    pk = current_app.config['ABE_PK']
    mk = current_app.config['ABE_MK']
    sk_bytes = issue_user_key(pk, mk, new_attributes)

    user.attributes = ','.join(new_attributes)
    user.secret_key = sk_bytes
    user.is_admin = 'ADMIN' in new_attributes
    db.session.commit()

    return jsonify({
        'message': 'Attributes updated and new key issued',
        'user': {
            'id': user.id,
            'username': user.username,
            'attributes': new_attributes
        }
    })


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@require_admin
def delete_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if user.is_admin:
        return jsonify({'error': 'Cannot delete admin user'}), 400

    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted successfully'})


@admin_bp.route('/stats', methods=['GET'])
@require_admin
def stats():
    return jsonify({
        'total_users': User.query.count(),
        'total_documents': Document.query.count(),
    })