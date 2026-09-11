# Shared Measurement Ingestion

## Purpose and boundary

All production vital sources persist through
`backend/measurement_ingestion.py`. Route adapters still own authentication,
patient-access checks, and source-specific mapping. The service owns the common
write pipeline:

```text
source adapter -> VitalCreate validation -> deduplication -> atomic write
               -> early warning -> optional post-ingest/live hook
```

This is an architectural consistency change, not a new clinical claim. The
service does not diagnose patients and does not replace the canonical risk
assessment.

## Production source mapping

| Source | Adapter | Stored source |
|---|---|---|
| Manual entry | `POST /vitals/` | `manual` |
| CSV upload | repeated `POST /vitals/` calls | `csv_upload` |
| Nurse workflow | `POST /role-actions/nurse/record-vitals` | request value, normally `manual` |
| Wearable API | `POST /wearables/vitals` | `wearable` |
| Condition simulator | `POST /live-simulator/generate/{patient_id}` | `simulator` |
| Withings webhook | `POST /integrations/withings/webhook` | `withings` |

Test fixtures and `seed_demo_data.py` may construct ORM rows directly because
they are not production ingestion interfaces.

## Responsibilities

The shared service:

- converts source-adapter mappings into the existing `VitalCreate` contract;
- sets the authoritative source supplied by the adapter;
- checks the configured deduplication policy before writing;
- writes the vital, optional patient status update, and optional audit row in
  one transaction;
- recovers idempotently from a concurrent duplicate external-ID insert;
- invokes existing early-warning processing once for a newly created vital;
- invokes an optional post-ingest hook once, allowing Withings to publish the
  persisted reading to live subscribers.

Authentication and patient authorization remain in the routes. Provider API
calls and measurement-code mapping remain in the Withings adapter.

## Deduplication policy

- Withings uses its unique `withings:{userid}:{group_id}` external ID. An
  external ID always takes precedence and retains database-level uniqueness.
- Without an external ID, the common key is normalized UTC timestamp, patient,
  and source.
- Equivalent offsets in legacy rows are compared as instants, so a stored
  `12:00+02:00` matches a new `10:00+00:00` observation from the same source.
- Duplicate measurements do not rerun early warning, audit, or live hooks. The
  manual/CSV endpoint continues to express a duplicate as HTTP 409; other
  adapters retain their existing success response.

Only `external_id` currently has a database unique constraint. The common key
is enforced by the service and therefore has a small concurrent-insert race
until a future migration can safely add a database constraint after checking
existing production data.

## Validation

Every stored production reading is revalidated against the repository's
existing `VitalCreate` bounds. The wearable request schema now applies the same
existing bounds to its overlapping fields before route execution.

New timestamps must be valid timezone-aware ISO-8601 datetimes and are stored
as UTC ISO-8601 strings. Diastolic pressure may not exceed systolic pressure.
Expected units, provider missingness, and complete bounds are documented in
[Measurement Validation](MEASUREMENT_VALIDATION.md).
