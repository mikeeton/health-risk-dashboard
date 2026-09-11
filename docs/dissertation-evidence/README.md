# Dissertation Evidence Pack

This directory contains generated, non-identifiable evidence for the AI Health
Risk Dashboard dissertation. Phase 5 currently supplies the `evaluation/`
section. Later roadmap phases may add architecture, security, deployment, and
screenshots without replacing these raw results.

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
