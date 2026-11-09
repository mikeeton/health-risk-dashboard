"""Request identifiers are safe to return and useful for tracing."""

from uuid import UUID, uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient

from middleware import RequestMetricsMiddleware


def test_request_id_accepts_uuid_and_replaces_untrusted_values():
    app = FastAPI()
    app.add_middleware(RequestMetricsMiddleware)

    @app.get("/ping")
    def ping():
        return {"ok": True}

    with TestClient(app) as client:
        supplied = str(uuid4())
        accepted = client.get("/ping", headers={"X-Request-ID": supplied})
        replaced = client.get("/ping", headers={"X-Request-ID": "not-a-uuid"})

    assert accepted.status_code == 200
    assert accepted.headers["X-Request-ID"] == supplied
    assert replaced.status_code == 200
    assert str(UUID(replaced.headers["X-Request-ID"])) == replaced.headers["X-Request-ID"]
    assert replaced.headers["X-Request-ID"] != "not-a-uuid"
