from collections import deque
from threading import Lock
from time import monotonic


class RequestTracker:
    def __init__(self):
        self._lock = Lock()
        self._started_at = monotonic()
        self._request_count = 0
        self._active_requests = 0
        self._status_counts: dict[str, int] = {}
        self._durations = deque(maxlen=500)

    def start_request(self):
        with self._lock:
            self._request_count += 1
            self._active_requests += 1

    def finish_request(self, status_code: int, duration_ms: float):
        with self._lock:
            self._active_requests = max(0, self._active_requests - 1)
            status_family = f"{status_code // 100}xx"
            self._status_counts[status_family] = (
                self._status_counts.get(status_family, 0) + 1
            )
            self._durations.append(duration_ms)

    def snapshot(self):
        with self._lock:
            durations = list(self._durations)
            average_ms = (
                round(sum(durations) / len(durations), 2)
                if durations
                else 0
            )

            return {
                "uptime_seconds": round(monotonic() - self._started_at, 2),
                "requests_total": self._request_count,
                "active_requests": self._active_requests,
                "status_counts": dict(self._status_counts),
                "average_response_ms_last_500": average_ms,
            }


request_tracker = RequestTracker()


class ComponentTracker:
    """Small process-local telemetry store; external monitoring should scrape /metrics."""

    def __init__(self):
        self._lock = Lock()
        self._values = {
            "ml_predictions_total": 0,
            "ml_prediction_failures_total": 0,
            "ml_prediction_ms_last": 0.0,
            "ml_shap_ms_last": 0.0,
            "ml_drift_suspensions_total": 0,
            "overdue_monitor_last_run": None,
            "overdue_monitor_last_error": None,
        }

    def set(self, **values):
        with self._lock:
            self._values.update(values)

    def increment(self, key: str, amount: int = 1):
        with self._lock:
            self._values[key] = int(self._values.get(key, 0)) + amount

    def snapshot(self):
        with self._lock:
            return dict(self._values)


component_tracker = ComponentTracker()
