import os
import firebase_admin
from firebase_admin import credentials, firestore, storage

_app = None
_db = None


def get_firebase_app():
    global _app
    if not firebase_admin._apps:
        service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
        if service_account_path:
            cred = credentials.Certificate(service_account_path)
        else:
            cred = credentials.ApplicationDefault()
        _app = firebase_admin.initialize_app(
            cred,
            {"storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET")},
        )
    else:
        _app = firebase_admin.get_app()
    return _app


def get_db():
    global _db
    if _db is None:
        get_firebase_app()
        _db = firestore.client()
    return _db


def get_bucket():
    get_firebase_app()
    return storage.bucket()
