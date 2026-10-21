# Snapse Empirical Research Protocol: Controlled Systems Monitoring Evaluation

## 1. Research Questions and Formal Hypotheses

### Research Question 1 (RQ1: Observer Overhead)
*How does the sampling interval $T \in \{250\text{ms}, 500\text{ms}, 1000\text{ms}, 2000\text{ms}\}$ quantitatively scale the observer overhead of desktop monitoring on Windows NT in terms of process CPU utilization, private memory footprint, IPC throughput, and system call frequency?*
- **Hypothesis $H_{1,0}$**: Scaling the sampling interval from 2000ms to 250ms produces no statistically significant increase in monitor process CPU utilization ($p \ge 0.05$).
- **Hypothesis $H_{1,1}$**: Monitor CPU overhead scales non-linearly with sampling frequency due to user-kernel context switching and snapshot serialization costs.

### Research Question 2 (RQ2: Metric Fidelity)
*What is the measurement distortion (Mean Absolute Error $\text{MAE}$, Root Mean Squared Error $\text{RMSE}$, and Pearson Correlation Coefficient $r$) introduced by coarser sampling intervals relative to continuous high-resolution ground truth?*
- **Hypothesis $H_{2,0}$**: Metric error does not increase significantly when sampling interval increases from 250ms to 2000ms during non-stationary workloads.
- **Hypothesis $H_{2,1}$**: For bursty, non-stationary workloads, $\text{MAE}$ increases significantly as $T$ increases, with Pearson correlation $r$ dropping below 0.85 for transient spikes shorter than $2T$.

### Research Question 3 (RQ3: Transient Event Latency & Miss Rate)
*What is the detection latency $\tau_{\text{detect}}$ and event omission rate $\mathcal{R}_{\text{miss}}$ for synthetic transient resource spikes of duration $T_{\text{burst}} \in [2.0\text{s}, 5.0\text{s}]$ across fixed sampling intervals versus adaptive rate control?*
- **Hypothesis $H_{3,0}$**: Fixed 2000ms polling detects transient events with identical latency and zero omission rate compared to 250ms polling.
- **Hypothesis $H_{3,1}$**: Fixed 2000ms polling exhibits a mean detection latency of $1000\text{ms} \pm 500\text{ms}$ and omits sub-2-second transient bursts that fall entirely between sample windows, whereas an adaptive controller detects events within $\le 300\text{ms}$ of initiation.

### Research Question 4 (RQ4: Pareto Frontier Optimization)
*Does a deterministic Volatility-Aware Adaptive Controller (VAC) Pareto-dominate static polling intervals by minimizing the combined objective $\mathcal{J} = \lambda \cdot \mathcal{O}_{\text{overhead}} + (1 - \lambda) \cdot \mathcal{E}_{\text{error}}$?*
- **Hypothesis $H_{4,0}$**: The adaptive controller's overhead-fidelity trade-off lies on or behind the convex hull established by static sampling rates.
- **Hypothesis $H_{4,1}$**: The adaptive controller achieves an overhead profile statistically comparable to $T=2000\text{ms}$ during idle regimes while maintaining metric fidelity and transient detection latency comparable to $T=250\text{ms}$ during active regimes.

### Research Question 5 (RQ5: Stability and Flapping Sensitivity)
*How sensitive is the adaptive sampling controller to the hysteresis threshold ratio $\frac{\theta_{\text{high}}}{\theta_{\text{low}}}$ and cool-down decay window $\tau_{\text{cool}}$ in suppressing state oscillation (flapping)?*
- **Hypothesis $H_{5,0}$**: Variations in hysteresis thresholds have no effect on state transition count per unit time under noisy metric streams.
- **Hypothesis $H_{5,1}$**: A cool-down window $\tau_{\text{cool}} \ge 4$ samples and $\theta_{\text{high}} / \theta_{\text{low}} \ge 2.5$ reduces transient state flapping by $> 80\%$ without increasing mean detection latency by more than 5%.

---

## 2. Mathematical Model and Controller Formalism

### 2.1 Instantaneous Volatility Metric
Let $S_t$ denote the operating system telemetry state vector sampled at discrete step $t$:
$$S_t = \begin{bmatrix} C_t \\ M_t \\ P_t \\ D_t \\ N_t \end{bmatrix} = \begin{bmatrix} \text{Global CPU \%} \\ \text{Physical Memory Used \%} \\ \text{Active Process Count} \\ \text{Disk Read/Write Bytes/sec} \\ \text{Network Rx/Tx Bytes/sec} \end{bmatrix}$$

We define the instantaneous system volatility $V(t) \in [0, 100]$ as a weighted composite of metric velocity:
$$V(t) = w_C \cdot |C_t - C_{t-1}| + w_M \cdot |M_t - M_{t-1}| + w_P \cdot \min\left(100, 10 \cdot |P_t - P_{t-1}|\right)$$
Default calibrated weights: $w_C = 0.60$, $w_M = 0.30$, $w_P = 0.10$, satisfying $\sum w_i = 1.0$.

### 2.2 Exponential Smoothing
To filter out transient high-frequency jitter, we apply an Exponential Moving Average (EMA):
$$\bar{V}(t) = \alpha \cdot V(t) + (1 - \alpha) \cdot \bar{V}(t-1)$$
where $\alpha \in (0, 1]$ is the smoothing factor (nominal $\alpha = 0.40$).

### 2.3 Finite State Machine (FSM) Transitions
The controller maintains one of three discrete sampling operational states $\mathcal{S} \in \{\text{IDLE}, \text{NORMAL}, \text{ACTIVE}\}$ with associated target intervals $T \in \{2000\text{ms}, 1000\text{ms}, 250\text{ms}\}$:

1. **Escalation (Fast Path)**:
   $$\text{If } \bar{V}(t) \ge \theta_{\text{high}} \implies \mathcal{S}_{t+1} \leftarrow \text{ACTIVE}, \quad \tau_{\text{cool}} \leftarrow K_{\text{cool}}$$
   where $\theta_{\text{high}} = 12.0\%$ volatility score and $K_{\text{cool}} = 4$ cycles. Escalation is immediate (zero lag).

2. **De-escalation (Hysteresis Guarded)**:
   If $\bar{V}(t) < \theta_{\text{high}}$, the controller evaluates the cool-down counter:
   - If $\tau_{\text{cool}} > 0$: $\tau_{\text{cool}} \leftarrow \tau_{\text{cool}} - 1$, retain current state $\mathcal{S}_{t+1} \leftarrow \mathcal{S}_t$.
   - If $\tau_{\text{cool}} = 0$:
     - If $\bar{V}(t) \ge \theta_{\text{low}}$: $\mathcal{S}_{t+1} \leftarrow \text{NORMAL}$ ($T = 1000\text{ms}$).
     - If $\bar{V}(t) < \theta_{\text{low}}$: $\mathcal{S}_{t+1} \leftarrow \text{IDLE}$ ($T = 2000\text{ms}$).
   where $\theta_{\text{low}} = 4.0\%$.

---

## 3. Experimental Variables

| Variable Class | Identifier | Description | Range / Values |
| :--- | :--- | :--- | :--- |
| **Independent** | $\mathcal{M}_{\text{mode}}$ | Sampling configuration mode | `Fixed_250ms`, `Fixed_500ms`, `Fixed_1000ms`, `Fixed_2000ms`, `Adaptive_VAC` |
| **Independent** | $\mathcal{W}_{\text{workload}}$ | Controlled synthetic workload scenario | `Idle_Baseline`, `CPU_Burst_Transient`, `Memory_Allocation_Ramp`, `Multi_Resource_Churn` |
| **Independent** | $N_{\text{reps}}$ | Repetitions per experimental condition | 10 independent trials per condition |
| **Dependent** | $\mathcal{O}_{\text{cpu}}$ | Snapse Process CPU utilization (%) | $0.0 - 100.0\%$ |
| **Dependent** | $\mathcal{O}_{\text{mem}}$ | Snapse Process Working Set (MB) | Private bytes |
| **Dependent** | $\mathcal{E}_{\text{MAE}}$ | Mean Absolute Error vs Ground Truth | Measured across aligned 100ms ground-truth timeline |
| **Dependent** | $\rho_{\text{pearson}}$ | Pearson correlation coefficient | $[-1.0, 1.0]$ |
| **Dependent** | $\tau_{\text{detect}}$ | Detection latency for transient burst | Milliseconds from burst start to telemetry detection |
| **Dependent** | $\Phi_{\text{flaps}}$ | State transition count per minute | Flapping events / min |

---

## 4. Statistical Testing Protocol

1. **Normality Test**: Shapiro-Wilk test on metric distributions across runs ($\alpha = 0.05$).
2. **Non-parametric Hypothesis Testing**:
   - For independent comparisons: Two-sided Mann-Whitney $U$ test.
   - For paired evaluations across identical synthetic runs: Wilcoxon signed-rank test.
3. **Effect Size**:
   - Cohen's $d$ for parametric distributions: $d = \frac{\mu_1 - \mu_2}{s_{\text{pooled}}}$.
   - Cliff's delta $\delta$ for non-parametric distributions.
4. **Significance Level**: Standard statistical threshold $\alpha = 0.01$ with Bonferroni correction for multi-hypothesis comparisons.
