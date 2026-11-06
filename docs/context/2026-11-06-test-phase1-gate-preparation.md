# Prepare the Phase 1 reliability regression gate

## Date and type

- Date: 2026-11-06 (Asia/Manila)
- Type: test

## Problem or goal

JUBRO-012 requires one regression view across the Phase 1 ownership, transfer, concurrency, input, import, typing, view, sync, and routing safeguards. The gate must not be marked passed while JUBRO-004 cross-device Firestore revision enforcement remains unresolved.

## Changes and resulting behavior

The repository test run now includes the JUBRO-011 tracker-target safety cases. The current gate matrix is:

| Area | Result | Evidence |
|---|---|---|
| JUBRO-001 ownership isolation | Passed | Existing automated ownership and Account A/B tests |
| JUBRO-002 guest transfer | Passed | Existing automatic, consent, decline, and failure tests |
| JUBRO-003 same-browser revisions | Passed | Existing stale-save and storage-event tests |
| JUBRO-004 cross-device revisions | Blocked | Firestore transaction/compare-and-set enforcement is not implemented |
| JUBRO-005 safe rendering | Passed | Existing safe DOM and URL tests |
| JUBRO-006 import safety | Passed | Existing validation, version, and atomicity tests |
| JUBRO-007 typed values | Passed | Existing checkbox and legacy normalization tests |
| JUBRO-008 List/Table consistency | Passed | Existing shared refresh and rejected-save tests |
| JUBRO-009 synthetic write removal | Passed | Existing Board startup write assertion |
| JUBRO-010 sync cleanup | Passed | Existing local-only, coalescing, ordering, and bounded-title-sync tests |
| JUBRO-011 tracker target safety | Passed | 10 focused routing tests |
| JUBRO-012 final Phase 1 sign-off | Not ready | Final gate requires JUBRO-004 first |

The completed automated gate portion reports 52 passing tests and 0 failures. JUBRO-012 remains preparation only, not a Phase 1 approval.

## Files affected

- [test/trackerRouting.test.mjs](../../test/trackerRouting.test.mjs): adds JUBRO-011 regression coverage used by the gate.
- Local-only ignored overview [docs/development.md](../development.md): records the expanded test scope and pending JUBRO-004 gate dependency.

## Verification

- `npm test`: 52 passed, 0 failed.
- `node --check` over 54 tracked JavaScript/MJS files: passed.
- JSON parsing over 3 tracked JSON files: passed.
- `git diff --check`: passed.
- No browser, responsive, production, or cross-device Firestore test was claimed; those require an available browser/deployment and JUBRO-004 implementation.

## Limitations

JUBRO-012 is not complete. Phase 1 cannot be marked passed until JUBRO-004 implements and verifies cloud-side stale revision rejection. No live production data was changed.
