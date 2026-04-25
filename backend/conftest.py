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
