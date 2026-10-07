"""Vercel serverless entrypoint for the PhraseAI FastAPI backend.

Vercel rewrites every `/api/*` request to this function (see `vercel.json`).
A rewritten request reaches the function with the *destination* path
(`/api/index`), not the path the browser asked for, so the rewrite carries the
original route in a `__path` query parameter. This ASGI shim restores that
route, strips the `/api` prefix, and hands the request to the FastAPI app in
`Coding/backend/app/main.py`, whose routes are declared without the prefix
(`/rewrite`, `/health`, ...). Un-prefixed and directly-prefixed paths are also
accepted so local tooling keeps working unchanged.
"""

import os
import sys
from urllib.parse import parse_qsl, urlencode

BACKEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Coding", "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.main import app as fastapi_app  # noqa: E402

API_PREFIX = "/api"
PATH_PARAM = "__path"


def _strip_prefix(path: str) -> str:
    if path == API_PREFIX or path.startswith(API_PREFIX + "/"):
        return path[len(API_PREFIX):] or "/"
    return path


async def app(scope, receive, send):
    if scope.get("type") in {"http", "websocket"}:
        scope = dict(scope)
        path = scope.get("path", "")
        query = scope.get("query_string", b"")
        params = parse_qsl(query.decode("latin-1"), keep_blank_values=True) if query else []
        forwarded = [value for key, value in params if key == PATH_PARAM]
        if forwarded:
            path = "/" + forwarded[-1].lstrip("/")
            params = [(key, value) for key, value in params if key != PATH_PARAM]
            scope["query_string"] = urlencode(params).encode("latin-1")
        path = _strip_prefix(path)
        scope["path"] = path
        scope["raw_path"] = path.encode("latin-1")
    await fastapi_app(scope, receive, send)
