use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SamplingMode {
    Fixed250,
    Fixed500,
    Fixed1000,
    Fixed2000,
    Adaptive,
}

impl SamplingMode {
    pub fn target_interval_ms(&self) -> u64 {
        match self {
            SamplingMode::Fixed250 => 250,
            SamplingMode::Fixed500 => 500,
            SamplingMode::Fixed1000 => 1000,
            SamplingMode::Fixed2000 => 2000,
            SamplingMode::Adaptive => 1000, // baseline start
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AdaptiveState {
    Idle,
    Normal,
    Active,
}

impl AdaptiveState {
    pub fn target_interval_ms(&self) -> u64 {
        match self {
            AdaptiveState::Idle => 2000,
            AdaptiveState::Normal => 1000,
            AdaptiveState::Active => 250,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            AdaptiveState::Idle => "IDLE",
            AdaptiveState::Normal => "NORMAL",
            AdaptiveState::Active => "ACTIVE",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ControllerConfig {
    pub w_cpu: f32,
    pub w_mem: f32,
    pub w_proc: f32,
    pub alpha: f32,
    pub theta_high: f32,
    pub theta_low: f32,
    pub cooldown_cycles: usize,
}

impl Default for ControllerConfig {
    fn default() -> Self {
        Self {
            w_cpu: 0.60,
            w_mem: 0.30,
            w_proc: 0.10,
            alpha: 0.40,
            theta_high: 12.0,
            theta_low: 4.0,
            cooldown_cycles: 4,
        }
    }
}

#[derive(Debug, Clone)]
pub struct VolatilityController {
    config: ControllerConfig,
    state: AdaptiveState,
    smoothed_volatility: f32,
    cooldown_remaining: usize,
    last_cpu: f32,
    last_mem: f32,
    last_procs: u32,
    state_transitions: u64,
}

impl VolatilityController {
    pub fn new(config: ControllerConfig) -> Self {
        Self {
            config,
            state: AdaptiveState::Normal,
            smoothed_volatility: 0.0,
            cooldown_remaining: 0,
            last_cpu: 0.0,
            last_mem: 0.0,
            last_procs: 0,
            state_transitions: 0,
        }
    }

    pub fn current_state(&self) -> AdaptiveState {
        self.state
    }

    pub fn state_transitions_count(&self) -> u64 {
        self.state_transitions
    }

    pub fn compute_instantaneous_volatility(&self, cpu: f32, mem_pct: f32, proc_count: u32) -> f32 {
        let delta_cpu = (cpu - self.last_cpu).abs();
        let delta_mem = (mem_pct - self.last_mem).abs();
        let delta_procs = (proc_count as i64 - self.last_procs as i64).abs() as f32;
        let proc_component = (delta_procs * 10.0).min(100.0);

        (self.config.w_cpu * delta_cpu)
            + (self.config.w_mem * delta_mem)
            + (self.config.w_proc * proc_component)
    }

    pub fn step(&mut self, cpu: f32, mem_pct: f32, proc_count: u32) -> (AdaptiveState, u64, f32, f32) {
        let inst_v = self.compute_instantaneous_volatility(cpu, mem_pct, proc_count);
        
        // Update history
        self.last_cpu = cpu;
        self.last_mem = mem_pct;
        self.last_procs = proc_count;

        // Exponential smoothing
        self.smoothed_volatility = (self.config.alpha * inst_v)
            + ((1.0 - self.config.alpha) * self.smoothed_volatility);

        let prev_state = self.state;

        // FSM Logic
        if self.smoothed_volatility >= self.config.theta_high {
            // Immediate escalation
            self.state = AdaptiveState::Active;
            self.cooldown_remaining = self.config.cooldown_cycles;
        } else if self.cooldown_remaining > 0 {
            // Cooldown holds state or normal minimum
            self.cooldown_remaining -= 1;
            if self.state == AdaptiveState::Idle {
                self.state = AdaptiveState::Normal;
            }
        } else if self.smoothed_volatility >= self.config.theta_low {
            self.state = AdaptiveState::Normal;
        } else {
            self.state = AdaptiveState::Idle;
        }

        if self.state != prev_state {
            self.state_transitions += 1;
        }

        (
            self.state,
            self.state.target_interval_ms(),
            inst_v,
            self.smoothed_volatility,
        )
    }

    pub fn reset(&mut self) {
        self.state = AdaptiveState::Normal;
        self.smoothed_volatility = 0.0;
        self.cooldown_remaining = 0;
        self.last_cpu = 0.0;
        self.last_mem = 0.0;
        self.last_procs = 0;
        self.state_transitions = 0;
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResearchTelemetryRecord {
    pub timestamp_ms: i64,
    pub mode: String,
    pub target_interval_ms: u64,
    pub actual_interval_ms: f64,
    pub jitter_ms: f64,
    pub collection_duration_us: u64,
    pub observer_cpu_percent: f32,
    pub observer_memory_bytes: u64,
    pub state: String,
    pub volatility_score: f32,
    pub smoothed_volatility: f32,
    pub system_cpu_percent: f32,
    pub system_memory_percent: f32,
    pub process_count: u32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_controller_idle_to_active_escalation() {
        let mut ctrl = VolatilityController::new(ControllerConfig::default());
        // Initial state is Normal
        assert_eq!(ctrl.current_state(), AdaptiveState::Normal);

        // Baseline step
        ctrl.step(5.0, 40.0, 150);

        // Inject severe spike in CPU: from 5.0% to 90.0%
        let (state, interval, inst_v, smooth_v) = ctrl.step(90.0, 40.0, 150);
        assert!(inst_v >= 50.0);
        assert!(smooth_v >= 12.0);
        assert_eq!(state, AdaptiveState::Active);
        assert_eq!(interval, 250);
    }

    #[test]
    fn test_controller_cooldown_prevents_immediate_drop() {
        let mut ctrl = VolatilityController::new(ControllerConfig {
            cooldown_cycles: 2,
            ..Default::default()
        });

        // Step 0: Baseline
        ctrl.step(10.0, 20.0, 100);

        // Step 1: Trigger spike
        ctrl.step(95.0, 20.0, 100);
        assert_eq!(ctrl.current_state(), AdaptiveState::Active);

        // Steps 2 & 3: EMA decays below theta_high (12.0)
        ctrl.step(95.0, 20.0, 100); // EMA = 12.24 (still >= 12.0)
        assert_eq!(ctrl.current_state(), AdaptiveState::Active);

        ctrl.step(95.0, 20.0, 100); // EMA = 7.344 (< 12.0), Cooldown cycle 1 (remaining: 1)
        assert_eq!(ctrl.current_state(), AdaptiveState::Active);

        ctrl.step(95.0, 20.0, 100); // EMA = 4.406, Cooldown cycle 2 (remaining: 0)
        assert_eq!(ctrl.current_state(), AdaptiveState::Active);

        // Step 5: Cooldown expired and EMA (2.64) < theta_low (4.0) -> De-escalates to Idle
        let (state, interval, _, _) = ctrl.step(95.0, 20.0, 100);
        assert_eq!(state, AdaptiveState::Idle);
        assert_eq!(interval, 2000);
    }
}
