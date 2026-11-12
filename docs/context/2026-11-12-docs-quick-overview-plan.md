# Plan the Quick Overview popup replacement

## Date and type

- Date: 2026-11-12 (Asia/Manila)
- Type: docs

## Problem or goal

The user supplied a detailed request to replace Dashboard analytics with Quick Overview. Record the grounded design and implementation plan before feature edits, including data semantics, empty states, compatibility boundaries, and verification.

## Changes and resulting behavior

Added design and implementation documents. No application behavior changed; the Dashboard remains as implemented in `c5fc7e7`. Feature implementation is pending plan review under the writing-plans workflow.

The plan reuses canonical rows, schema helpers, status colors, period filtering, modal lifecycle, Add Application, and current persistence safeguards. Need Attention excludes Rejected/Withdrawn in V1. Insights remains unimplemented and its proposed populated-state CTA is disabled. The two named screenshot files are not available locally or attached, so exact image matching cannot be verified.

## Files affected

- `docs/superpowers/specs/2026-11-12-quick-overview-design.md`: design boundaries and repository-derived decisions; local-only under the existing `/docs/*` ignore rule.
- `docs/superpowers/plans/2026-11-12-quick-overview.md`: test-first implementation tasks, exact integration files, checks, and stop condition; local-only under the existing `/docs/*` ignore rule. Neither document was force-added.
- This context record: documentation-only completion and implementation status.

## Verification

- Inspected Dashboard rendering, date filtering, modal/event/refresh wiring, SVG chart references, canonical field resolution, strict date normalization, shared status colors, relevant tests, and local architecture/features documentation.
- Searched for Insights references/routes; no existing implementation was found.
- Checked the plan against the requested metrics, populated/empty states, responsive themes, canonical state, and deferred Insights boundary.
- `git diff --check`: passed. Only this context record is staged for the documentation commit; the existing Git ignore policy is unchanged.
- No tests or browser checks were run for this documentation-only change. Previous feature checks do not verify the proposed redesign.

## Limitations

No Quick Overview feature code has been implemented. The writing-plans workflow requires user review before implementation. Screenshots were referenced by filename only and are unavailable for visual comparison. No push performed.
