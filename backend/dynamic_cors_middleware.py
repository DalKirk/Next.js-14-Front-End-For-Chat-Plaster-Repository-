from typing import Set
from starlette.types import ASGIApp, Receive, Scope, Send
from starlette.responses import Response

class DynamicCORSMiddleware:
    """
    ASGI middleware that sets CORS headers dynamically by echoing the
    request Origin when it is on a whitelist. Also handles OPTIONS preflight.

    Usage (FastAPI / Starlette):

    from fastapi import FastAPI
    from backend.dynamic_cors_middleware import DynamicCORSMiddleware

    WHITELIST = {
        "https://video-chat-frontend-ruby.vercel.app",
        "https://next-js-14-front-end-for-chat-plast.vercel.app",
        "http://localhost:3000",
    }

    app = FastAPI()
    app.add_middleware(DynamicCORSMiddleware, whitelist=WHITELIST)

    Notes:
    - This middleware echoes the Origin header only when it matches the
      provided whitelist. It sets Access-Control-Allow-Credentials to true.
    - Preflight (OPTIONS) requests are answered directly with 204 and
      appropriate headers.
    - Keep the whitelist small and controlled to avoid security issues.
    """

    def __init__(self, app: ASGIApp, whitelist: Set[str]):
        self.app = app
        self.whitelist = set(whitelist)

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        # Only handle HTTP requests
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Extract Origin header (headers are list of [name, value] bytes)
        headers = {k.decode().lower(): v.decode() for k, v in scope.get("headers", [])}
        origin = headers.get("origin")

        if origin and origin in self.whitelist:
            # Handle preflight OPTIONS directly
            if scope.get("method", "").upper() == "OPTIONS":
                response = Response(status_code=204)
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
                response.headers["Access-Control-Allow-Headers"] = "Authorization,Content-Type,Accept"
                await response(scope, receive, send)
                return

            # For normal requests, call the app but inject CORS headers into the response start
            async def send_with_cors(message):
                if message["type"] == "http.response.start":
                    headers_list = message.setdefault("headers", [])
                    headers_list.extend([
                        (b"access-control-allow-origin", origin.encode()),
                        (b"access-control-allow-credentials", b"true"),
                    ])
                await send(message)

            await self.app(scope, receive, send_with_cors)
            return

        # Not a whitelisted origin, pass through
        await self.app(scope, receive, send)
