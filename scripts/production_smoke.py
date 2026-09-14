"""Non-sensitive production smoke checker.

Public checks always run. Authenticated read-only checks run only when
SMOKE_EMAIL and SMOKE_PASSWORD are supplied through the process environment.
Tokens and response bodies are never written to the report.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import ssl
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen


def clean_origin(value: str) -> str:
    parts = urlsplit(value.strip())
    if parts.scheme != "https" or not parts.netloc:
        raise ValueError("Production smoke origins must be absolute HTTPS URLs")
    return urlunsplit((parts.scheme, parts.netloc, parts.path.rstrip("/"), "", ""))


def request_json(
    origin: str,
    path: str,
    *,
    method: str = "GET",
    token: str | None = None,
    payload: dict | None = None,
) -> tuple[int, dict, dict[str, str]]:
    body = json.dumps(payload).encode() if payload is not None else None
    headers = {"Accept": "application/json", "User-Agent": "health-risk-smoke/1"}
    if payload is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = Request(
        urljoin(f"{origin}/", path.lstrip("/")),
        data=body,
        headers=headers,
        method=method,
    )
    try:
        with urlopen(request, timeout=75, context=ssl.create_default_context()) as response:
            raw = response.read()
            try:
                parsed = json.loads(raw) if raw else {}
            except (json.JSONDecodeError, UnicodeDecodeError):
                parsed = {}
            return response.status, parsed, {
                key.lower(): value for key, value in response.headers.items()
            }
    except HTTPError as error:
        return error.code, {}, {
            key.lower(): value for key, value in error.headers.items()
        }
    except (URLError, TimeoutError) as error:
        return 0, {}, {"error": type(error).__name__}


def result(name: str, status: str, **metadata) -> dict:
    return {"name": name, "status": status, **metadata}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-url", required=True)
    parser.add_argument("--frontend-url", required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    api_origin = clean_origin(args.api_url)
    frontend_origin = clean_origin(args.frontend_url)
    checks: list[dict] = []

    frontend_status, _, frontend_headers = request_json(frontend_origin, "/")
    checks.append(
        result(
            "frontend",
            "passed" if frontend_status == 200 else "failed",
            http_status=frontend_status,
            security_headers={
                name: bool(frontend_headers.get(name.lower()))
                for name in (
                    "Content-Security-Policy",
                    "Strict-Transport-Security",
                    "X-Content-Type-Options",
                    "X-Frame-Options",
                )
            },
        )
    )

    live_status, live_payload, live_headers = request_json(api_origin, "/health/live")
    suspended = live_headers.get("x-render-routing") == "suspend"
    checks.append(
        result(
            "backend_liveness",
            "passed" if live_status == 200 else "failed",
            http_status=live_status,
            classification="service_suspended" if suspended else "http_response",
            reported_status=live_payload.get("status"),
        )
    )

    ready_status, ready_payload, _ = request_json(api_origin, "/health/ready")
    checks.append(
        result(
            "backend_readiness",
            "passed" if ready_status == 200 else "failed",
            http_status=ready_status,
            components={
                key: ready_payload.get(key)
                for key in ("database", "redis", "degraded", "ml_model")
                if key in ready_payload
            },
        )
    )

    email = os.getenv("SMOKE_EMAIL", "").strip()
    password = os.getenv("SMOKE_PASSWORD", "")
    mfa_code = os.getenv("SMOKE_MFA_CODE", "").strip() or None
    authenticated_names = (
        "login",
        "patient_dashboard",
        "health_data",
        "canonical_assessment",
        "ml_evidence_and_attribution",
        "alert_workflow",
        "groq_assistant",
    )
    if ready_status != 200:
        checks.extend(
            result(name, "skipped", reason="backend_not_ready")
            for name in authenticated_names
        )
    elif not email or not password:
        checks.extend(
            result(name, "skipped", reason="smoke_credentials_not_supplied")
            for name in authenticated_names
        )
    else:
        login_status, login_payload, _ = request_json(
            api_origin,
            "/auth/login",
            method="POST",
            payload={"email": email, "password": password, "mfa_code": mfa_code},
        )
        access_token = login_payload.get("access_token")
        refresh_token = login_payload.get("refresh_token")
        checks.append(result("login", "passed" if access_token else "failed", http_status=login_status))
        if access_token:
            patient_status, patients, _ = request_json(api_origin, "/patients/", token=access_token)
            patient_id = patients[0].get("id") if patient_status == 200 and patients else None
            checks.append(result("patient_dashboard", "passed" if patient_id else "unavailable", http_status=patient_status))
            endpoint_checks = (
                ("health_data", f"/vitals/{patient_id}"),
                ("canonical_assessment", f"/patients/{patient_id}/risk-assessment"),
                ("ml_evidence_and_attribution", f"/ml/predict/{patient_id}"),
                ("alert_workflow", "/reviews/"),
                ("groq_assistant", "/assistant/configuration"),
            )
            for name, path in endpoint_checks:
                if not patient_id and "{patient_id}" in path:
                    checks.append(result(name, "skipped", reason="no_accessible_patient"))
                    continue
                status, payload, _ = request_json(api_origin, path, token=access_token)
                metadata = {"http_status": status}
                if name == "ml_evidence_and_attribution":
                    metadata["source"] = payload.get("source")
                    metadata["attribution_method"] = payload.get("attribution_method")
                if name == "groq_assistant":
                    metadata["enabled"] = payload.get("enabled")
                    metadata["governance_ready"] = payload.get("governance_ready")
                checks.append(result(name, "passed" if status == 200 else "failed", **metadata))
        else:
            checks.extend(
                result(name, "skipped", reason="login_failed")
                for name in authenticated_names[1:]
            )
        if refresh_token:
            request_json(
                api_origin,
                "/auth/logout",
                method="POST",
                payload={"refresh_token": refresh_token},
            )

    report = {
        "schema_version": "production-smoke-v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "api_origin": api_origin,
        "frontend_origin": frontend_origin,
        "contains_secrets": False,
        "checks": checks,
        "summary": {
            state: sum(check["status"] == state for check in checks)
            for state in ("passed", "failed", "skipped", "unavailable")
        },
    }
    rendered = json.dumps(report, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    print(rendered, end="")
    return 1 if report["summary"]["failed"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
