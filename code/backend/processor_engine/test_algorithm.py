import unittest
from datetime import datetime, timedelta
import algorithm

class TestAlgorithm(unittest.TestCase):

    def test_newton_interpolation_linear(self):
        # 2 nodes: linear extrapolation
        # (0, 10), (10, 20) -> Target 20 should be 30
        x_nodes = [0.0, 10.0]
        y_nodes = [10.0, 20.0]
        val = algorithm.newton_extrapolate(x_nodes, y_nodes, 20.0)
        self.assertAlmostEqual(val, 30.0)

    def test_newton_interpolation_quadratic(self):
        # 3 nodes: quadratic extrapolation
        # (0, 0), (1, 1), (2, 4) -> P(x) = x^2. Target 3 should be 9
        x_nodes = [0.0, 1.0, 2.0]
        y_nodes = [0.0, 1.0, 4.0]
        val = algorithm.newton_extrapolate(x_nodes, y_nodes, 3.0)
        self.assertAlmostEqual(val, 9.0)

    def test_newton_avoid_high_degree_runge(self):
        # If we supply 5 nodes, Newton should select the last 3 for quadratic fit
        # nodes: (0, 100), (1, 200), (2, 4), (3, 9), (4, 16) -> last 3: (2, 4), (3, 9), (4, 16)
        # quadratic fit: P(x) = x^2. Target 5 should be 25
        x_nodes = [0.0, 1.0, 2.0, 3.0, 4.0]
        y_nodes = [100.0, 200.0, 4.0, 9.0, 16.0]
        val = algorithm.newton_extrapolate(x_nodes, y_nodes, 5.0)
        self.assertAlmostEqual(val, 25.0)

    def test_worked_example_1_threshold(self):
        # base_threshold = 75%, RR_adj = 18% (High), RF_adj = 7%, IF_adj = 8%, DL_adj = 3%
        # AT = 75 - 18 - 7 - 8 - 3 = 39%
        at, floor, ceil = algorithm.calculate_adaptive_threshold(
            base_threshold=75.0,
            threshold_floor=30.0,
            rr_adj=18.0,
            rf_adj=7.0,
            if_adj=8.0,
            dl_adj=3.0
        )
        self.assertEqual(at, 39.0)
        self.assertFalse(floor)
        self.assertFalse(ceil)

    def test_worked_example_2_release_recommendation(self):
        # r = 3.2%/hr -> GateOpening_base% = 30 + ((3.2 - 2.5)/1.5)*40 = 30 + 0.7/1.5*40 = 30 + 18.66% = 48.66%, rounded to 50%
        # MaxGateCapacity = 150 m³/s -> Q_desired = 75 m³/s
        # DownstreamCapacity = 300 m³/s, DL(t) = 60% -> Q_downstream_available = 300 * 0.4 = 120 m³/s
        # Q_release = min(75, 120, 150) = 75 m³/s
        # GateOpening_applied% = 50%
        # conflict_warning = False
        rec = algorithm.calculate_release_recommendation(
            rr_pred_15=3.2,
            max_gate_capacity=150.0,
            downstream_capacity=300.0,
            dl_now=60.0,
            l_now=40.0,
            adaptive_threshold_now=39.0,
            threshold_floor=30.0,
            reservoir_capacity=10000000.0,
            inflow_now=80.0
        )
        self.assertEqual(rec["gate_opening_base_pct"], 50.0)
        self.assertEqual(rec["q_desired"], 75.0)
        self.assertEqual(rec["q_downstream_available"], 120.0)
        self.assertEqual(rec["q_release"], 75.0)
        self.assertEqual(rec["gate_opening_applied_pct"], 50.0)
        self.assertFalse(rec["conflict_warning"])

    def test_ttc_null_comparison_guard(self):
        # TTC is None (no crossing predicted)
        status, reason = algorithm.classify_risk_status(
            gap_current=10.0,
            ttc=None,
            rr_band="NORMAL",
            gap_trend="stable"
        )
        self.assertEqual(status, "GREEN")
        
        # When gap is decreasing and TTC is None, status should be YELLOW
        status, reason = algorithm.classify_risk_status(
            gap_current=10.0,
            ttc=None,
            rr_band="NORMAL",
            gap_trend="decreasing"
        )
        self.assertEqual(status, "YELLOW")

    def test_insufficient_history_newton(self):
        # Empty nodes should raise InsufficientDataError
        with self.assertRaises(algorithm.InsufficientDataError):
            algorithm.newton_extrapolate([], [], 15.0)

    def test_net_outflow_zero_duration_guard(self):
        # NetOutflow = Q_release - Inflow = 50 - 60 = -10 (which is <= 0)
        # verify estimated duration is None (not negative or infinite)
        rec = algorithm.calculate_release_recommendation(
            rr_pred_15=3.2,
            max_gate_capacity=100.0,
            downstream_capacity=200.0,
            dl_now=50.0,
            l_now=40.0,
            adaptive_threshold_now=39.0,
            threshold_floor=30.0,
            reservoir_capacity=10000000.0,
            inflow_now=90.0 # exceeding release (q_desired=50.0, release=50.0)
        )
        self.assertIsNone(rec["estimated_duration_minutes"])

    def test_worst_band_wins(self):
        # If multiple parameters are true, critical beats high, elevated
        # RR_pred = 4.5 (Critical > 4.0)
        # RR_short = 1.0 (Normal)
        # ACC = 0.2 (Normal)
        # DEV = 0.5 (Normal)
        band = algorithm.determine_rr_band(rr_pred_or_long=4.5, rr_short=1.0, acc=0.2, dev=0.5)
        self.assertEqual(band, "CRITICAL")
        
        # RR_pred = 2.8 (High)
        # RR_short = 5.0 (High)
        # ACC = 0.2 (Normal)
        # DEV = 0.5 (Normal)
        band = algorithm.determine_rr_band(rr_pred_or_long=2.8, rr_short=5.0, acc=0.2, dev=0.5)
        self.assertEqual(band, "HIGH")

    def test_deescalation_transition_checks(self):
        # RED -> ORANGE de-escalation:
        # RR_band below High (Elevated/Normal) AND ACC < 0 AND L stable or dropping
        res = algorithm.check_deescalation_conditions(
            transition="RED -> ORANGE",
            rr_band="ELEVATED",
            acc=-0.5,
            l_now=40.0,
            l_prev=40.0,
            r_net_now=5.0,
            r_net_prev=5.0
        )
        self.assertTrue(res)
        
        # Fail due to positive ACC
        res_fail = algorithm.check_deescalation_conditions(
            transition="RED -> ORANGE",
            rr_band="ELEVATED",
            acc=0.1,
            l_now=40.0,
            l_prev=40.0,
            r_net_now=5.0,
            r_net_prev=5.0
        )
        self.assertFalse(res_fail)

        # ORANGE -> YELLOW de-escalation:
        # RR_band within Elevated AND ACC <= 0 AND R_net decreasing
        res_orange = algorithm.check_deescalation_conditions(
            transition="ORANGE -> YELLOW",
            rr_band="ELEVATED",
            acc=0.0,
            l_now=40.0,
            l_prev=40.0,
            r_net_now=4.0,
            r_net_prev=5.0 # R_net is decreasing
        )
        self.assertTrue(res_orange)

if __name__ == '__main__':
    unittest.main()
