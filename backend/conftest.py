"""
Stub heavy ML dependencies before any test module is imported.

sentence_transformers (used by the AI feature) requires PyTorch (~1 GB) which
is not installed in the test environment. This stub allows all test files to do
`from app.main import app` without triggering a torch download.

Production code is not affected — pytest loads this file only during test runs.
"""
import sys
from unittest.mock import MagicMock

if "sentence_transformers" not in sys.modules:
    sys.modules["sentence_transformers"] = MagicMock()

if "firebase_admin" not in sys.modules:
    class FakeInvalidIdTokenError(Exception):
        pass

    mock_firebase = MagicMock()
    mock_firebase.auth.InvalidIdTokenError = FakeInvalidIdTokenError
    mock_firebase.auth.verify_id_token = MagicMock(side_effect=FakeInvalidIdTokenError("Invalid token"))

    sys.modules["firebase_admin"] = mock_firebase
    sys.modules["firebase_admin.credentials"] = mock_firebase.credentials
    sys.modules["firebase_admin.auth"] = mock_firebase.auth
