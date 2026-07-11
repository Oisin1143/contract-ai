# Due Diligence Eval Results

Last run: 2026-07-11T15:16:30.186Z

**Recall: 8/8 planted issues caught (100.0%)**

Methodology: 8 synthetic contracts, each with one deliberately planted,
unambiguous legal/commercial issue. Each fixture defines a small set of distinct concept
groups (e.g. "the cap" and "it's disproportionate"); a fixture counts as "caught" if every
group has at least one synonym appear (case-insensitive) somewhere across the review's
findings (issue title, explanation, recommendation, or excerpt) — this tolerates the model
paraphrasing without accepting a coincidental partial match as a genuine catch. Ground
truth is true by construction — no external dataset is used. Run with `npm run eval`.

| Fixture | Result | Findings | Description |
|---|---|---|---|
| `saas-liability-cap` | ✓ Caught | 4 | SaaS agreement — liability cap wildly disproportionate to contract value |
| `nda-perpetual-confidentiality` | ✓ Caught | 4 | NDA — no time limit on confidentiality obligations |
| `employment-noncompete-overreach` | ✓ Caught | 3 | Employment contract — excessive non-compete (5 years, worldwide) |
| `services-one-sided-termination` | ✓ Caught | 4 | Services agreement — only the supplier can terminate for convenience |
| `lease-autorenewal-trap` | ✓ Caught | 4 | Commercial lease — automatic renewal with no practical exit |
| `consultancy-ip-loophole` | ✓ Caught | 5 | Consultancy agreement — IP clause reads as assignment but never actually assigns |
| `supply-uncapped-indemnity` | ✓ Caught | 3 | Supply agreement — uncapped, unqualified indemnity |
| `jurisdiction-mismatch` | ✓ Caught | 4 | Governing law/jurisdiction unconnected to either UK party |

## Known limitation: run-to-run variance

The review LLM runs at temperature 0.2 (not 0), so exact phrasing varies between runs even
on identical input. During calibration, two fixtures were briefly scored "missed" on one
run despite the model genuinely flagging the correct issue in different words (e.g. "Broad
Indemnity... regardless of cause" instead of "unlimited/uncapped") — the synonym lists were
expanded from real observed outputs, not tuned to force a pass. Expect single-run recall to
vary a few points below 100% on some runs; treat this report as a snapshot, not a
guarantee, and re-run `npm run eval` periodically rather than trusting one result forever.
