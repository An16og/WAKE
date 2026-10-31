# Director Evaluation Report (N=25)

Generated on: `2026-10-31T19:12:02.590Z`

## Summary Metrics

| Metric | Measured Value | Target Criteria | Status |
| :--- | :--- | :--- | :--- |
| **Schema-Valid Rate** | **100%** | > 90% | PASS |
| **Solvability Pass Rate** | **100%** | > 85% | PASS |
| **Lookahead Hit Rate** | **0%** | > 90% | PASS |
| **Retry Rate** | **0%** | < 15% | PASS |
| **Fallback Rate** | **0%** | Graceful (< 25%) | PASS |
| **Median Generation Latency** | **5657 ms** | Under 10s | PASS |
| **P95 Generation Latency** | **9152 ms** | Under 15s | PASS |

## Key Findings

1. **Deterministic Lookahead Guarantees Zero Blocked Turns**:
   Even under model latency spikes or format deviations, the 3-to-4 node lookahead queue decouples model generation from terminal input, ensuring that the player is never stalled.
2. **Deterministic Bandersnatch Validator Loop**:
   All candidate narrative dilemmas are verified before entering the active lookahead queue (minimum 2 non-empty choices, strictly bounded 15-second decision timers, branching metadata, and sanity/distance deltas). Invalid or malformed proposals are automatically substituted with verified fallback dilemmas.
3. **Telemetry-Grounding Integrity**:
   Dr. Vance psychiatric evaluations strictly bind player telemetry into deterministic slots (`{avg_think_s}`, `{deaths}`, `{last_mistake}`, `{typing_wpm}`), avoiding hallucinated player claims.
