# Measurement Validation Contract

## Scope

This contract applies to new production measurements entering
`measurement_ingestion.ingest_vital`. It improves software correctness and
data provenance; the accepted ranges are engineering plausibility checks, not
clinical validation or diagnostic thresholds.

## Timestamp contract

New timestamps must be ISO-8601 datetimes with an explicit UTC offset or `Z`.
The backend converts the instant to UTC and stores an ISO-8601 value ending in
`+00:00`. Examples:

| Input | Result |
|---|---|
| `2026-09-11T12:30:00+02:00` | `2026-09-11T10:30:00+00:00` |
| `2026-09-11T10:30:00Z` | `2026-09-11T10:30:00+00:00` |
| `2026-09-11T10:30:00` | rejected: timezone missing |
| `not-a-timestamp` | rejected: malformed |

The database column remains a string for compatibility. Historic rows are not
rewritten, but deduplication parses valid historic offsets before comparing
instants.

## Fields, units, and accepted bounds

All source adapters convert or supply these internal units before ingestion.
The same contract is exposed in the API schema.

| Field | Internal unit | Accepted range |
|---|---|---|
| Heart rate | bpm | 20–240 |
| SpO2 | percent | 50–100 |
| Systolic blood pressure | mmHg | 40–260 |
| Diastolic blood pressure | mmHg | 20–180 |
| Steps | count | 0–200,000 |
| Sleep | hours | 0–24 |
| Active time | minutes | 0–1,440 |
| Calories | kcal | 0–20,000 |
| Risk score | repository score | 0–10 |

Withings values are converted from the provider's integer value and decimal
exponent into these base units before mapping. Manual, CSV, nurse, wearable,
and simulator adapters accept only the documented internal units; the current
API deliberately has no ambiguous unit-selection parameter.

In addition to individual bounds, diastolic pressure cannot exceed systolic
pressure. Negative activity values are rejected by the lower bounds.

## Missing Withings values

The Withings adapter no longer substitutes missing values with a previous
observation or fixed values such as heart rate 70, SpO2 98, or blood pressure
120/80. It maps only values fetched for the provider measurement group.

The current wide `vitals` table requires every physiological and activity
field to be non-null. A partial provider measurement therefore cannot be
represented honestly without making an unavailable field look measured.
Incomplete Withings groups are skipped and a warning records the patient ID,
external measurement ID, and missing field names. They are not persisted,
risk-scored, alerted, or published as complete observations.

This is intentionally conservative and means that the current Withings
measure-group mapping will not persist partial device observations. It avoids
false reassurance at the cost of data availability.

## Additive migration proposal

A future, separately reviewed migration should add a normalized observation
table rather than weaken existing `Vital` semantics. A candidate child record
would contain patient, observed time, metric, numeric value, unit, source,
external ID, and verification status. Provider fields could then be stored
individually, while a complete wide `Vital` would be materialized only when the
required measurements genuinely exist.

That migration must also make baseline, ML, canonical assessment, charts, and
exports explicitly missing-aware before partial observations enter those
paths. It is not part of Phase 4.

## Deduplication

External provider IDs take precedence. Otherwise, the deterministic service
key is:

```text
patient_id + normalized UTC timestamp + source
```

This prevents one source retry from duplicating its own reading while allowing
two independently identified sources to report measurements at the same
instant. Service-level enforcement is deterministic in normal requests; only
external IDs currently have database-enforced race protection.
