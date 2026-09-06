use std::time::Duration;

pub fn poll_interval(locked: bool, hovering: bool) -> Duration {
    Duration::from_millis(if locked && !hovering { 250 } else { 100 })
}

#[derive(Default)]
pub struct IdleTimer(Duration);

impl IdleTimer {
    pub fn observe(&mut self, stationary: bool, elapsed: Duration) {
        // A suspended process cannot observe whether the pointer/window moved.
        // Require a fresh hold after a long gap instead of instantly unlocking.
        if stationary && elapsed <= Duration::from_secs(1) {
            self.0 += elapsed;
        } else {
            self.reset();
        }
    }
    pub fn reset(&mut self) {
        self.0 = Duration::ZERO;
    }
    pub fn seconds(&self) -> f32 {
        self.0.as_secs_f32()
    }
    pub fn progress(&self, wait: f32, hold: f32) -> f32 {
        if self.seconds() < wait {
            0.0
        } else if hold <= 0.0 {
            100.0
        } else {
            ((self.seconds() - wait) / hold * 100.0).clamp(0.0, 100.0)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn idle_polling_slows_only_outside_a_locked_overlay() {
        assert_eq!(poll_interval(true, false), Duration::from_millis(250));
        for state in [(true, true), (false, false), (false, true)] {
            assert_eq!(poll_interval(state.0, state.1), Duration::from_millis(100));
        }
    }
    #[test]
    fn hold_time_is_wall_time_even_when_polling_cadence_changes() {
        let mut timer = IdleTimer::default();
        for _ in 0..4 {
            timer.observe(true, Duration::from_millis(250));
        }
        assert_eq!(timer.progress(1.0, 3.0), 0.0);
        for _ in 0..15 {
            timer.observe(true, Duration::from_millis(100));
        }
        assert_eq!(timer.progress(1.0, 3.0), 50.0);
        for _ in 0..15 {
            timer.observe(true, Duration::from_millis(100));
        }
        assert_eq!(timer.progress(1.0, 3.0), 100.0);
        timer.observe(false, Duration::from_secs(9));
        assert_eq!(timer.seconds(), 0.0);
        timer.observe(true, Duration::from_secs(1));
        assert_eq!(timer.progress(1.0, 0.0), 100.0);
        timer.reset();
        assert_eq!(timer.seconds(), 0.0);
    }
    #[test]
    fn process_suspension_cannot_complete_a_hover_hold_or_auto_lock() {
        let mut timer = IdleTimer::default();
        timer.observe(true, Duration::from_millis(500));
        timer.observe(true, Duration::from_secs(5));
        assert_eq!(timer.seconds(), 0.0);
        assert_eq!(timer.progress(1.2, 3.0), 0.0);
        timer.observe(true, Duration::from_millis(100));
        assert_eq!(timer.seconds(), 0.1);
    }
}
