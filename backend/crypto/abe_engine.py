from charm.schemes.abenc.abenc_bsw07 import CPabe_BSW07
from charm.toolbox.pairinggroup import PairingGroup, GT
from charm.core.engine.util import objectToBytes, bytesToObject
from cryptography.fernet import Fernet
import hashlib
import base64

# Initialize pairing group and CP-ABE
group = PairingGroup('SS512')
cpabe = CPabe_BSW07(group)


def setup():
    """Generate master public and secret keys — run once by Central Authority"""
    (pk, mk) = cpabe.setup()
    return pk, mk


def keygen(pk, mk, attributes):
    """
    Generate a user key based on their attributes.
    attributes: list e.g. ['HR', 'LEVEL3', 'ADMIN']
    Note: No underscores allowed in attribute names.
    """
    attributes = [a.upper().replace('_', '') for a in attributes]
    sk = cpabe.keygen(pk, mk, attributes)
    return sk


def encrypt(pk, plaintext, policy):
    """
    Encrypt a message under an access policy.
    Policy example: '((HR and LEVEL3) or ADMIN)'
    Plaintext: str or bytes
    Note: No underscores allowed in policy attribute names.
    """
    if isinstance(plaintext, str):
        plaintext = plaintext.encode('utf-8')

    # Generate random GT element as ABE key material
    sym_key_element = group.random(GT)

    # Derive AES key from GT element
    sym_key_bytes = hashlib.sha256(group.serialize(sym_key_element)).digest()
    fernet_key = base64.urlsafe_b64encode(sym_key_bytes)
    f = Fernet(fernet_key)

    # Encrypt plaintext with AES
    encrypted_data = f.encrypt(plaintext)

    # Encrypt GT element under ABE policy
    ct_abe = cpabe.encrypt(pk, sym_key_element, policy)

    return {
        'ct_abe': ct_abe,
        'ct_data': encrypted_data
    }


def decrypt(pk, sk, ciphertext):
    """
    Decrypt ciphertext using user's secret key.
    Returns plaintext bytes or None if access denied.
    """
    try:
        ct_abe = ciphertext['ct_abe']
        ct_data = ciphertext['ct_data']

        # Recover GT element using ABE
        sym_key_element = cpabe.decrypt(pk, sk, ct_abe)

        if sym_key_element is False or sym_key_element is None:
            return None

        # Derive same AES key
        sym_key_bytes = hashlib.sha256(group.serialize(sym_key_element)).digest()
        fernet_key = base64.urlsafe_b64encode(sym_key_bytes)
        f = Fernet(fernet_key)

        # Decrypt data
        plaintext = f.decrypt(ct_data)
        return plaintext

    except Exception:
        return None


def serialize_key(key):
    """Serialize a user secret key to bytes for DB storage"""
    return objectToBytes(key, group)


def deserialize_key(data):
    """Deserialize a user secret key from bytes"""
    return bytesToObject(data, group)