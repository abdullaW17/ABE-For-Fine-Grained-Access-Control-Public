from flask import Blueprint, request, jsonify, current_app, send_file
from database import db, Document
from routes.auth import get_current_user
from crypto.abe_engine import encrypt, decrypt, deserialize_key, serialize_key
from charm.core.engine.util import objectToBytes, bytesToObject
from charm.toolbox.pairinggroup import PairingGroup
import os
import uuid
import json
import base64

docs_bp = Blueprint('documents', __name__)

group = PairingGroup('SS512')


def save_ciphertext(ct, file_path):
    """Save ciphertext to file using Charm's serializer"""
    ct_abe_bytes = objectToBytes(ct['ct_abe'], group)
    data = {
        'ct_abe': base64.b64encode(ct_abe_bytes).decode('utf-8'),
        'ct_data': base64.b64encode(ct['ct_data']).decode('utf-8')
    }
    with open(file_path, 'w') as f:
        json.dump(data, f)


def load_ciphertext(file_path):
    """Load ciphertext from file"""
    with open(file_path, 'r') as f:
        data = json.load(f)
    ct_abe = bytesToObject(base64.b64decode(data['ct_abe']), group)
    ct_data = base64.b64decode(data['ct_data'])
    return {'ct_abe': ct_abe, 'ct_data': ct_data}


@docs_bp.route('/upload', methods=['POST'])
def upload():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    policy = request.args.get('policy') or request.form.get('policy', '')
    policy = policy.strip()

    if not policy:
        return jsonify({'error': 'Access policy required'}), 400

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Read file content
    file_content = file.read()

    # Encrypt using CP-ABE
    pk = current_app.config['ABE_PK']
    try:
        ct = encrypt(pk, file_content, policy)
    except Exception as e:
        return jsonify({'error': f'Encryption failed: {str(e)}'}), 500

    # Save encrypted file to storage
    file_id = str(uuid.uuid4())
    enc_filename = f"{file_id}.enc"
    storage_dir = current_app.config['STORAGE_DIR']
    file_path = os.path.join(storage_dir, enc_filename)

    save_ciphertext(ct, file_path)

    # Save metadata to DB
    doc = Document(
        filename=enc_filename,
        original_filename=file.filename,
        policy=policy,
        uploader_id=user.id,
        file_path=file_path,
        file_size=len(file_content)
    )
    db.session.add(doc)
    db.session.commit()

    return jsonify({
        'message': 'File uploaded and encrypted successfully',
        'document': {
            'id': doc.id,
            'filename': doc.original_filename,
            'policy': doc.policy,
            'uploaded_by': user.username,
            'size': doc.file_size
        }
    }), 201


@docs_bp.route('/', methods=['GET'])
def list_documents():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    docs = Document.query.order_by(Document.created_at.desc()).all()
    return jsonify([{
        'id': d.id,
        'filename': d.original_filename,
        'policy': d.policy,
        'uploaded_by': d.uploader.username,
        'size': d.file_size,
        'created_at': d.created_at.isoformat()
    } for d in docs])


@docs_bp.route('/download/<int:doc_id>', methods=['GET'])
def download(doc_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    doc = Document.query.get(doc_id)
    if not doc:
        return jsonify({'error': 'Document not found'}), 404

    # Load encrypted file
    ct = load_ciphertext(doc.file_path)

    # Try to decrypt with user's key
    pk = current_app.config['ABE_PK']
    sk = deserialize_key(user.secret_key)
    plaintext = decrypt(pk, sk, ct)

    if plaintext is None:
        return jsonify({'error': 'Access denied. Your attributes do not satisfy the policy.'}), 403

    from io import BytesIO
    return send_file(
        BytesIO(plaintext),
        download_name=doc.original_filename,
        as_attachment=True
    )


@docs_bp.route('/<int:doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    doc = Document.query.get(doc_id)
    if not doc:
        return jsonify({'error': 'Document not found'}), 404

    if doc.uploader_id != user.id and not user.is_admin:
        return jsonify({'error': 'Permission denied'}), 403

    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)

    db.session.delete(doc)
    db.session.commit()

    return jsonify({'message': 'Document deleted successfully'})