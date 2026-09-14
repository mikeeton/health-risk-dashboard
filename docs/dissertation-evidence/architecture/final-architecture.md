# Final implemented architecture

```mermaid
flowchart TB
  subgraph Sources[Data sources]
    Manual[Manual entry]
    CSV[CSV upload]
    Simulator[Condition-based simulator]
    Withings[Withings OAuth data fetch]
  end

  Sources --> Ingestion[Shared validated ingestion service]
  Ingestion --> PostgreSQL[(PostgreSQL source of truth)]
  PostgreSQL --> Baseline[Patient baseline v2]
  PostgreSQL --> Features[Temporal feature engineering]
  Baseline --> Canonical[Canonical risk assessment v1]
  Features --> ML[Versioned supervised ML]
  Features --> Isolation[Isolation Forest anomaly signal]
  ML --> Canonical
  Isolation --> Canonical
  Canonical --> Safety[Deterministic critical safety rules]
  Safety --> Warning[Early warning and ReviewCase workflow]
  Warning --> API[Authenticated FastAPI]
  PostgreSQL --> API
  API --> Dashboard[React dashboard]

  API -. bounded pseudonymised context .-> Groq[Optional Groq advisory explanation]
  Groq -. narrative only; never scoring .-> API

  Redis[(Optional Redis)] -. notification invalidation hints .-> API
```

## Interpretation

All accepted observations pass through the shared validation, UTC normalization,
deduplication, persistence, and post-ingestion hooks before they are available to
downstream assessment. PostgreSQL is authoritative. Patient-relative baselines,
temporal ML features, and anomaly evidence inform the versioned canonical
assessment, while deterministic critical thresholds retain escalation priority.

Groq is a separate, optional advisory branch. It receives bounded server-built
context only after authorization and cannot change risk scores, predictions,
alerts, or ReviewCases. Redis carries non-authoritative change hints; REST
polling and PostgreSQL state remain available when Redis fails.

## Deployment mapping

The intended portfolio deployment maps the React build to Vercel, FastAPI to
Render, PostgreSQL to Neon, and optional Redis to Upstash. Groq remains disabled
unless its configuration and governance gates are satisfied. This diagram
describes implemented component relationships, not proof that each external
provider is currently healthy.
