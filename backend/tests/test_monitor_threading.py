import asyncio
import threading

import main


def test_monitor_cycle_runs_off_the_asgi_event_loop(monkeypatch):
    caller_thread = threading.get_ident()
    monkeypatch.setattr(main, "run_monitor_cycle", lambda elapsed: (threading.get_ident(), elapsed + 1))

    worker_thread, next_elapsed = asyncio.run(main.run_monitor_cycle_async(2))

    assert worker_thread != caller_thread
    assert next_elapsed == 3


def test_monitor_cycle_survives_temporary_session_creation_failure(monkeypatch):
    def unavailable():
        raise OSError("Temporary database outage")

    monkeypatch.setattr(main, "SessionLocal", unavailable)
    assert main.run_monitor_cycle(2) == 2
