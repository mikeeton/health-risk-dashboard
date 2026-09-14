# Performance evidence

The canonical generated performance results are retained in:

- [`../evaluation/performance_summary.json`](../evaluation/performance_summary.json)
- [`../evaluation/performance_samples.csv`](../evaluation/performance_samples.csv)

The experiment measured 30 complete in-process iterations after one warm-up.
Mean latency was 22.0232 ms, median 10.9621 ms, and p95 85.4816 ms. It used
SQLite in memory on one Windows development workstation. These measurements are
reproducible software-performance evidence, not Render/Neon latency, concurrent
capacity, availability, or clinical-response-time evidence.
