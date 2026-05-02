import unittest
from algorithm import *
import config

class TestAlgorithm(unittest.TestCase):

    def setUp(self):
        config.BASE_THRESHOLD = 75.0
        config.IF_baseline = 120.0
        config.ReservoirCapacity = 10000000.0
        config.MaxGateCapacity = 5000.0
        config.DownstreamCapacity = 2000.0

    def test_21_1_normal_case(self):
        rr_band = determine_rr_band(rr_short=1.5, rr_long=0.5, acc=0.2, dev=0.5)
        self.assertEqual(rr_band, "NORMAL")
        rr_adj, rf_adj, if_adj, dl_adj = calculate_adjustments(rr_band, RF=5.0, IF=100.0, DL=40.0)
        at = calculate_adaptive_threshold(rr_adj, rf_adj, if_adj, dl_adj)
        self.assertEqual(at, 75.0)
        status, _ = determine_status_full(L=40.0, AT=at, rr_band=rr_band, DL=40.0, acc=0.2)
        self.assertEqual(status, "GREEN")

    def test_21_2_sudden_spike(self):
        rr_short, rr_long = calculate_rise_rates(L_now=48.0, L_15=46.5, L_60=44.0)
        self.assertEqual(rr_short, 6.0)
        self.assertEqual(rr_long, 4.0)
        
        rr_band = determine_rr_band(rr_short=rr_short, rr_long=rr_long, acc=1.0, dev=1.0)
        # Should be HIGH because rr_short is 6.0 (between 4.0 and 7.0)
        self.assertEqual(rr_band, "HIGH")

    def test_21_3_critical_deviation(self):
        dev = calculate_deviation(rr_short=6.0, ra=1.0)
        self.assertEqual(dev, 5.0)
        # Exact rule: DEV > 5.0 for critical. So DEV=5.0 is HIGH, not CRITICAL.
        # But if RR_short=6.0, it triggers HIGH directly.
        rr_band = determine_rr_band(rr_short=6.0, rr_long=1.0, acc=0.0, dev=5.0)
        self.assertEqual(rr_band, "HIGH")
        
        rr_band_crit = determine_rr_band(rr_short=6.0, rr_long=1.0, acc=0.0, dev=5.1)
        self.assertEqual(rr_band_crit, "CRITICAL")

    def test_21_4_adaptive_threshold(self):
        at = calculate_adaptive_threshold(rr_adj=18, rf_adj=7, if_adj=8, dl_adj=3)
        self.assertEqual(at, 39.0)

    def test_21_5_red_status(self):
        status, _ = determine_status_full(L=40.0, AT=39.0, rr_band="HIGH", DL=50.0, acc=1.0)
        self.assertEqual(status, "RED")

    def test_21_6_orange_status(self):
        # L > AT - 3 but <= AT
        # Example: AT=39.0. margin_3 = 36.0. If L=38.0, it is > 36.0 and <= 39.0.
        status, _ = determine_status_full(L=38.0, AT=39.0, rr_band="NORMAL", DL=50.0, acc=0.0)
        self.assertEqual(status, "ORANGE")

    def test_21_7_downstream_conflict(self):
        # AT=39, L=70 -> safe_storage_rate = (39 - 70) * 10M / 60 = -31 * 166666 = -5,166,666
        # release_rate = IF (2000) - (-5,166,666) = 5,168,666
        # max_safe_release = 2000 * (1 - 90/100) = 200
        rec = calculate_release_recommendation(L=70.0, AT=39.0, IF=2000.0, DL=90.0)
        self.assertEqual(rec["MaxSafeRelease"], 200.0)
        self.assertEqual(rec["ReleaseRate"], 200.0)
        self.assertEqual(rec["conflict_warning"], "Full required release exceeds downstream capacity | Release rate is not greater than inflow; reservoir level may not decrease.")

if __name__ == '__main__':
    unittest.main()
