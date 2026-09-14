# Dissertation Evidence Pack

This directory contains generated, non-identifiable evidence for the AI Health
Risk Dashboard dissertation. Raw evaluation results are retained alongside the
final architecture, derived tables, performance/security interpretation,
screenshot manifest, limitations, and dated deployment smoke evidence.

The evidence is software and ML proof-of-concept evaluation. It is not clinical
validation and contains no real patient records, credentials, or access tokens.

Regenerate the evaluation results from `backend/`:

```bash
python -m evaluation_suite
```

The default seed, repetition counts, installed model metadata, test environment,
and limitations are recorded alongside each output.

- [Evaluation methodology and results](evaluation/README.md)
- [Machine-readable summary](evaluation/summary.json)
- [Output manifest](evaluation/manifest.json)
- [Final implemented architecture](architecture/final-architecture.md)
- [Dissertation-ready evaluation table](tables/evaluation-summary.csv)
- [Performance evidence](performance/README.md)
- [Security and reliability evidence](security/README.md)
- [Screenshot manifest](screenshots/README.md)
- [Production smoke evidence](deployment/README.md)
- [Limitations](LIMITATIONS.md)

No file in this pack should contain provider secrets, access/refresh tokens,
real patient identifiers, or raw clinical records. Regenerate dated deployment
evidence only with the provided smoke checker, which deliberately records
status metadata rather than response bodies.
