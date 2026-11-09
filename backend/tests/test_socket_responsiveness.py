import asyncio
import threading

import main
from routes import notifications


class ClosingSocket:
    def __init__(self):
        self.closed_code = None

    async def accept(self):
        pass

    async def close(self, *, code):
        self.closed_code = code


def test_notification_database_checks_leave_event_loop_free(monkeypatch):
    caller_thread = threading.get_ident()
    check_threads = []
    monkeypatch.setattr(
        notifications,
        "notification_socket_user_id",
        lambda _ticket: check_threads.append(threading.get_ident()) or 1,
    )
    monkeypatch.setattr(
        notifications,
        "notification_socket_signature",
        lambda *_args: check_threads.append(threading.get_ident()) or None,
    )
    socket = ClosingSocket()

    asyncio.run(notifications.notification_socket(socket, "synthetic-ticket"))

    assert socket.closed_code == 1008
    assert len(check_threads) == 2
    assert all(thread != caller_thread for thread in check_threads)


def test_live_vital_scope_checks_leave_event_loop_free(monkeypatch):
    caller_thread = threading.get_ident()
    check_threads = []
    monkeypatch.setattr(
        main,
        "live_socket_user_id",
        lambda *_args: check_threads.append(threading.get_ident()) or None,
    )
    socket = ClosingSocket()
    socket.query_params = {"ticket": "synthetic-ticket"}

    asyncio.run(main.websocket_live_monitoring(socket, 7))

    assert socket.closed_code == 1008
    assert len(check_threads) == 1
    assert check_threads[0] != caller_thread
