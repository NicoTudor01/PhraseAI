"""Vercel serverless entrypoint for the PhraseAI FastAPI backend.

Vercel routes every `/api/*` request to this function (see the rewrite in
`vercel.json`). The FastAPI app in `Coding/backend/app/main.py` declares its
routes without the `/api` prefix (`/rewrite`, `/health`, ...), so a small ASGI
shim strips that prefix before handing the request to the real app. The shim
also accepts un-prefixed paths so local tooling keeps working unchanged.
"""

import os
import sys

BACKEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Coding", "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.main import app as fastapi_app  # noqa: E402

API_PREFIX = "/api"


async def app(scope, receive, send):
    if scope.get("type") in {"http", "websocket"}:
        path = scope.get("path", "")
        if path == API_PREFIX or path.startswith(API_PREFIX + "/"):
            stripped = path[len(API_PREFIX):] or "/"
            scope = dict(scope)
            scope["path"] = stripped
            raw_path = scope.get("raw_path")
            if isinstance(raw_path, (bytes, bytearray)) and raw_path.startswith(API_PREFIX.encode()):
                scope["raw_path"] = raw_path[len(API_PREFIX):] or b"/"
    await fastapi_app(scope, receive, send)
