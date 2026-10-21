# Academic Conference Submission Checklist (ACM/SPEC ICPE / JSS)

## 1. Title and Abstract
- [x] Clear, precise title reflecting empirical study and adaptive control.
- [x] Abstract states problem, context (Windows NT), methodology, quantitative findings, and artifact availability.
- [x] Avoids sensationalized or unprovable marketing claims.

## 2. Research Integrity & Open Science
- [x] Zero fabricated, hallucinated, or placeholder numbers.
- [x] Source code and reproduction harness committed to version control.
- [x] Machine-readable telemetry logs formatted in standard CSV with UTC epoch timestamps.
- [x] Complete Data Dictionary provided (`experiments/DATA_DICTIONARY.md`).
- [x] Single-command replication guide documented (`experiments/REPRODUCE.md`).

## 3. Related Work & Positioning
- [x] Thorough citations of foundational profiler literature (Mytkowicz 2010, Curtsinger 2015, Malony 1992, Cantrill 2004).
- [x] Explicit, respectful contrast with Mertz & Nunes (2023) detailing domain differences (managed Java method tracing vs. native Windows kernel snapshots).
- [x] BibTeX entries include full DOIs, publisher names, and accurate page ranges.

## 4. Methodology & Statistical Rigor
- [x] Research questions (RQ1–RQ5) clearly formulated with null and alternative hypotheses.
- [x] Non-parametric statistics reported (median, IQR) alongside means.
- [x] Multi-hypothesis correction (Bonferroni / Holm) applied.
- [x] Controlled synthetic workloads isolate CPU, memory, disk, and churn scenarios.
- [x] Observer effect quantified on the monitor process itself.

## 5. Artifact Evaluation Readiness
- [x] Standalone benchmark executable (`benchmark.exe`) compiles with standard `cargo build --release`.
- [x] PowerShell execution scripts automated and deterministic.
- [x] Python analysis and figure plotting scripts self-contained.
- [x] All 9 publication figures generated at 300 DPI.
