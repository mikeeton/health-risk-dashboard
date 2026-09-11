from __future__ import annotations

import argparse
import json
from pathlib import Path

from .runner import DEFAULT_OUTPUT, run_evaluation_suite


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate reproducible dissertation evaluation evidence."
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--seed", type=int, default=20260911)
    parser.add_argument("--false-alert-trials", type=int, default=30)
    parser.add_argument("--attribution-repeats", type=int, default=5)
    parser.add_argument("--performance-iterations", type=int, default=30)
    args = parser.parse_args()
    manifest = run_evaluation_suite(
        args.output,
        seed=args.seed,
        false_alert_trials=args.false_alert_trials,
        attribution_repeats=args.attribution_repeats,
        performance_iterations=args.performance_iterations,
    )
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
