# Publication Venue Assessment and Target Selection

## 1. Candidate Venues Analysis

We evaluated candidate academic conferences and journals in the software engineering, systems performance, and empirical computer science domains.

| Venue | Full Title & Scope | Alignment Score (1-5) | Acceptance Rate | Strengths / Trade-offs | Fit Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **IEEE/ACM ICSE** | International Conference on Software Engineering | 4.2 / 5 | ~20-22% | Premier SE venue; welcomes empirical studies and software tools. Highly competitive; expects broad developer impact or massive software ecosystem datasets. | **Strong Track (SEIP or Tool Track)** |
| **ACM/SPEC ICPE** | International Conference on Performance Engineering | **4.9 / 5** | ~24-28% | **Highest alignment.** Focuses directly on system profiling, measurement perturbation, benchmarking methodology, and runtime monitoring. Prior art (e.g., Kieker, causal profiling) frequently published here. | **Primary Target (Research Track)** |
| **IEEE Transactions on Software Engineering (TSE)** | IEEE Transactions on Software Engineering | 4.6 / 5 | Variable | Premier journal. High tolerance for in-depth empirical studies with rigorous statistical power. Lengthy review cycles (6–9 months). | **Top Journal Target** |
| **USENIX ATC** | USENIX Annual Technical Conference | 4.1 / 5 | ~16-18% | Premier systems venue. Favors large kernel subsystems, distributed frameworks, or novel virtualization architectures. An evaluation of desktop monitoring may be deemed too narrow unless framed around Windows internals. | Secondary Target |
| **Elsevier JSS** | Journal of Systems and Software | **4.8 / 5** | ~25% | Direct home of Mertz & Nunes (2023). Excellent thematic continuity for empirical software runtime monitoring and adaptive sampling. Rapid turnaround. | **Primary Journal Target** |

---

## 2. Selection Rationale

- **Primary Conference Target**: **ACM/SPEC ICPE (Research Track)**.
  - *Justification*: Snapse’s focus on performance perturbation, low-level Windows NT kernel interrogation costs, Pareto multi-objective optimization, and empirical measurement rigor matches ICPE's core call for papers perfectly.
- **Primary Journal Target**: **Journal of Systems and Software (JSS)**.
  - *Justification*: Offers direct dialogue with the 2023 Mertz & Nunes paper, facilitating a clear contrast between managed runtime tracing and operating system desktop monitoring.

---

## 3. Formatting and Length Constraints

- **ICPE Format**: ACM Primary Article Template (2-column `sigconf`), 10 pages + references.
- **Artifact Evaluation**: ICPE actively participates in Artifact Badging (Available, Evaluated, Reusable). Snapse’s dedicated benchmark harness, reproducible scripts, and open data dictionary maximize artifact badging prospects.
