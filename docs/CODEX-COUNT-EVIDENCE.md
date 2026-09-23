# Codex expected-count evidence

`collect-codex-catalog.mjs --expected-counts` is an optional independent completeness cross-check. A bare number is intentionally insufficient because the resulting artifact must preserve why that count is independent of the endpoint being checked.

Use one object per skill:

```json
{
  "cooking": {
    "count": 123,
    "source": "independent catalog audit / source identifier / version",
    "observedAt": "2026-09-23T00:00:00Z"
  },
  "alchemy": {
    "count": 321,
    "source": "independent catalog audit / source identifier / version",
    "observedAt": "2026-09-23T00:00:00Z"
  }
}
```

The `count` must be a positive integer, `source` must identify the independent evidence sufficiently for later review, and `observedAt` must be a parseable timestamp. The normalized evidence is retained in the generated catalog artifact.

This metadata does not by itself prove independence. Release review must still verify that the named source is genuinely independent of the candidate endpoint/count being reconciled. If that cannot be established, do not use the expected-count path as completeness evidence.

The endpoint itself must separately satisfy the fail-closed Codex catalog scope contract. Product/item-scoped transports remain invalid even when their row count matches supplied expected-count evidence.
