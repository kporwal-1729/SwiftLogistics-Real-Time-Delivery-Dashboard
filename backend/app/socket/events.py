import socketio
from app.core.auth import decode_token

# Async Socket.IO server
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)

socket_app = socketio.ASGIApp(sio, socketio_path="/ws/socket.io")


@sio.event
async def connect(sid, environ, auth):
    """Client connects. Auth token passed via handshake query."""
    token = None
    # Try to extract token from cookies in headers
    http_cookie = environ.get("HTTP_COOKIE", "")
    for part in http_cookie.split(";"):
        part = part.strip()
        if part.startswith("access_token="):
            token = part[len("access_token="):]
            break

    if token:
        payload = decode_token(token)
        if payload:
            role = payload.get("role", "customer")
            user_id = payload.get("sub")
            # Store session info
            await sio.save_session(sid, {"user_id": user_id, "role": role})
            # Admins/dispatchers auto-join the dispatcher room
            if role == "admin":
                await sio.enter_room(sid, "dispatcher")
            print(f"[WS] Connected: {sid} role={role}")
            return True

    # Allow connection even without auth (they won't be in any useful room)
    await sio.save_session(sid, {"user_id": None, "role": "guest"})
    return True


@sio.event
async def join_order_room(sid, data):
    """Customer calls this to receive updates for a specific order."""
    order_id = data.get("order_id")
    if order_id:
        await sio.enter_room(sid, f"order_{order_id}")
        print(f"[WS] {sid} joined room order_{order_id}")


@sio.event
async def leave_order_room(sid, data):
    order_id = data.get("order_id")
    if order_id:
        await sio.leave_room(sid, f"order_{order_id}")


@sio.event
async def disconnect(sid):
    print(f"[WS] Disconnected: {sid}")
