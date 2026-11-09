# Integration and reliability report

Date: 19 October 2026. Scope: inspection only of Withings, measurement persistence, alerting and live-update boundaries. No production provider or patient records were touched.

The Withings webhook validates a callback token and fetches measurements using the provider API. It maps HR, SpO2 and BP but then requires every field in a wider eight-field schema, so sparse groups are skipped (`backend/routes/integrations_withings.py`). `backend/measurement_ingestion.py` supports an external ID for deduplication, but commits a vital before `evaluate_new_vital`; a downstream failure can leave an unassessed measurement. Socket delivery is separate and does not by itself guarantee cross-instance or offline receipt. Notification read state is distinct from clinical alert resolution in the existing design.

Priority next batch: specify nullable partial-observation storage and source metadata, migrate if required, then test representative HR-only, BP-only, duplicated and out-of-order fixtures. Add durable alert assessment state or outbox with retry and idempotency; test exceptions between measurement commit, assessment and publication. Document queue/Redis outage and reconnection behaviour. No live Withings end-to-end success or exactly-once delivery is claimed.

Interface update, 19 October 2026: the new `/devices` hub shows device-sourced readings and actual connection/sync state, including explicit status-load errors; `/notifications` now makes read status visibly distinct from clinical case resolution. These changes do not address the sparse-observation or durable-delivery backend gaps above. Local backend tests passed 118; mocked browser fixtures are not live Withings or outage tests.
