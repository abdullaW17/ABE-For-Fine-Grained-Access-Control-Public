import os
import json
from crypto.abe_engine import setup, keygen, serialize_key, deserialize_key

KEYS_DIR = os.path.join(os.path.dirname(__file__), '..', 'keys')
PK_FILE = os.path.join(KEYS_DIR, 'master_pk.bin')
MK_FILE = os.path.join(KEYS_DIR, 'master_mk.bin')


def initialize_authority():
    """
    Run once to generate and save master public/secret keys.
    If keys already exist, load them instead.
    """
    os.makedirs(KEYS_DIR, exist_ok=True)

    if os.path.exists(PK_FILE) and os.path.exists(MK_FILE):
        print("[CA] Loading existing master keys...")
        with open(PK_FILE, 'rb') as f:
            pk = deserialize_key(f.read())
        with open(MK_FILE, 'rb') as f:
            mk = deserialize_key(f.read())
    else:
        print("[CA] Generating new master keys...")
        pk, mk = setup()
        with open(PK_FILE, 'wb') as f:
            f.write(serialize_key(pk))
        with open(MK_FILE, 'wb') as f:
            f.write(serialize_key(mk))
        print("[CA] Master keys saved.")

    return pk, mk


def issue_user_key(pk, mk, attributes):
    """
    Issue a secret key to a user based on their attributes.
    attributes: list of strings e.g. ['HR', 'LEVEL_3']
    Returns serialized key bytes.
    """
    sk = keygen(pk, mk, attributes)
    return serialize_key(sk)


def load_user_key(sk_bytes):
    """Deserialize a user secret key from bytes"""
    return deserialize_key(sk_bytes)


def load_public_key():
    """Load the master public key"""
    with open(PK_FILE, 'rb') as f:
        return deserialize_key(f.read())
