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

## Deduplication policy in Phase 3

Phase 3 deliberately preserves the policies that existed before this refactor:

- Withings uses its unique `withings:{userid}:{group_id}` external ID. An
  external ID always takes precedence and retains database-level uniqueness.
- The manual/CSV endpoint rejects an existing patient/timestamp pair with HTTP
  409, matching its previous behavior.
- Nurse, wearable, and simulator sources do not receive a new deduplication
  rule in this phase.

A universal non-provider policy is deferred to Phase 4 so this refactor does
not silently change the meaning of duplicates.

## Validation and timestamp limitation

Every stored production reading is revalidated against the repository's
existing `VitalCreate` bounds. The wearable request schema now applies the same
existing bounds to its overlapping fields before route execution.

Timestamps remain stored in the existing string column and retain the incoming
representation. Strict ISO-8601 parsing, timezone awareness, UTC
normalisation, cross-field validation, missing-provider-value semantics, unit
enforcement, and the universal deduplication key are Phase 4 work. This avoids
claiming those guarantees before they are implemented and tested.
