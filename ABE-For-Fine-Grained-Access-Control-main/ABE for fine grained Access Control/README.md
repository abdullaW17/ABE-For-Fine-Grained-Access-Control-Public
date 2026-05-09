# ABE Vault — Attribute-Based Encryption for Fine-Grained Access Control

**Group 18 | FAST NUCES**

A secure document management platform that uses **Ciphertext-Policy Attribute-Based Encryption (CP-ABE)** to enforce fine-grained access control. Documents are encrypted under an access policy, and only users whose attributes satisfy that policy can decrypt and download them.

---

## How It Works

Traditional access control checks permissions at the server level — you trust the server to enforce rules. ABE shifts this to the cryptographic level: a document encrypted under the policy `(HR and LEVEL3) or ADMIN` can **only** be decrypted by a user who holds a secret key embedding those attributes. The server cannot bypass this even if compromised.

The system uses the **BSW07 CP-ABE scheme** (Bethencourt, Sahai, Waters 2007) via the Charm cryptography framework, with hybrid encryption: ABE encrypts a symmetric key, which in turn encrypts the actual file content using AES (Fernet).

---

## Project Structure

```
├── backend/
│   ├── app.py                  # Flask app factory, blueprint registration
│   ├── database.py             # SQLAlchemy models (User, Document)
│   ├── requirements.txt        # Python dependencies
│   ├── key_authority.py        # Standalone key authority helper
│   ├── keys/
│   │   ├── master_pk.bin       # Master public key (generated on first run)
│   │   └── master_mk.bin       # Master secret key (generated on first run)
│   ├── crypto/
│   │   ├── abe_engine.py       # Core CP-ABE: setup, keygen, encrypt, decrypt
│   │   └── key_authority.py    # Initialize authority, issue user keys
│   └── routes/
│       ├── auth.py             # Login, JWT generation, /me, change-password
│       ├── documents.py        # Upload, list, download, delete documents
│       └── admin.py            # User management, attribute updates, stats
└── frontend/
    ├── src/
    │   ├── App.js              # Root component, auth state, page routing
    │   ├── api.js              # Axios instance, all API call functions
    │   ├── pages/
    │   │   ├── Login.jsx       # Login form
    │   │   ├── Dashboard.jsx   # Document listing and download
    │   │   ├── Upload.jsx      # File upload with policy input
    │   │   └── Admin.jsx       # User creation and attribute management
    │   └── components/
    │       └── Navbar.jsx      # Navigation bar
    └── package.json
```

---

## Prerequisites

### Backend
- Python 3.8+
- [Charm-Crypto](https://github.com/JHUISI/charm) — must be installed from source (provides CP-ABE and pairing groups)
- pip packages listed in `requirements.txt`

### Frontend
- Node.js 16+
- npm

---

## Setup & Installation

### 1. Install Charm-Crypto

Charm cannot be installed via pip and must be built manually:

```bash
git clone https://github.com/JHUISI/charm.git
cd charm
./configure.sh
make
sudo make install
```

Refer to the [Charm documentation](https://jhuisi.github.io/charm/) for platform-specific instructions.

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
python app.py
```

On first run, the system automatically:
- Generates master public/secret keys and saves them to `backend/keys/`
- Creates the SQLite database (`abe_platform.db`)
- Creates a default admin user

**Default admin credentials:**
```
Username: admin
Password: admin123
```
> Change this password immediately after first login.

The backend runs on `http://127.0.0.1:5000`.

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

The frontend runs on `http://localhost:3000` and connects to the backend at `http://127.0.0.1:5000/api`.

---

## API Reference

### Auth — `/api/auth`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | Login and receive a JWT token |
| GET | `/me` | Get current user info |
| POST | `/change-password` | Change your password |

### Documents — `/api/documents`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all documents |
| POST | `/upload?policy=<policy>` | Upload and encrypt a file |
| GET | `/download/<id>` | Decrypt and download a file |
| DELETE | `/<id>` | Delete a document |

### Admin — `/api/admin` *(admin only)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all users |
| POST | `/users` | Create a new user with attributes |
| PUT | `/users/<id>/attributes` | Update a user's attributes (reissues ABE key) |
| DELETE | `/users/<id>` | Delete a user |
| GET | `/stats` | Get user and document counts |

---

## Usage Guide

### Writing Access Policies

Policies use attribute names combined with `and` / `or` operators and parentheses:

```
ADMIN
HR and LEVEL3
(HR and LEVEL3) or ADMIN
(FINANCE and MANAGER) or ADMIN
```

> Attribute names must be uppercase with no underscores. The system enforces this automatically.

### Uploading a Document

1. Log in and navigate to **Upload**
2. Select a file and enter an access policy (e.g. `HR and LEVEL3`)
3. The file is encrypted on the server under that policy and stored — the plaintext is never saved to disk

### Downloading a Document

1. Navigate to **Dashboard** — all uploaded documents are listed
2. Click download on any document
3. The server attempts to decrypt using your ABE secret key — if your attributes satisfy the policy, the plaintext file is returned; otherwise access is denied

### Creating Users (Admin)

1. Navigate to **Admin** panel
2. Enter a username, password, and comma-separated attributes (e.g. `HR, LEVEL3`)
3. The system issues a unique ABE secret key embedding those attributes

---

## Security Notes

- JWT tokens expire after 24 hours
- Passwords are hashed with bcrypt
- The master secret key (`master_mk.bin`) must be kept secure — it can issue keys for any attributes
- The `SECRET_KEY` in `app.py` and the master keys should be rotated before deploying to production
- Encrypted files are stored in a `storage/` directory as `.enc` files; the plaintext is never persisted

---

## Dependencies

### Backend (`requirements.txt`)
```
flask
flask-cors
flask-sqlalchemy
pyjwt
bcrypt
cryptography
```
Plus **Charm-Crypto** (installed from source).

### Frontend
- React 19
- Axios
- react-router-dom
