import numpy as np
import random
from sklearn.preprocessing import StandardScaler
from math import radians, sin, cos, sqrt, atan2

class Tier1Authenticator:
    """
    A class to handle Tier 1 behavior-based authentication.
    It requires an enrollment phase to create a personalized user profile.
    """
    def __init__(self, age, alpha_mean=0.05, alpha_std=0.02):
        self.age = age
        self.alpha_mean = alpha_mean
        self.alpha_std = alpha_std
        self.D_ref = None
        self.D_std = None
        self.is_enrolled = False
        self.idle_count = 0
        self.idle_threshold = 3

    def _haversine(self, lat1, lon1, lat2, lon2):
        R = 6371.0
        dlat, dlon = np.radians(lat2 - lat1), np.radians(lon2 - lon1)
        a = np.sin(dlat / 2)**2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon / 2)**2
        return 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a)) * R

    def enroll(self, enrollment_vectors: list, min_samples=5):
        if len(enrollment_vectors) < min_samples:
            print(f"Enrollment failed: Need at least {min_samples} samples.")
            return
        enrollment_data = np.array(enrollment_vectors, dtype=np.float32)
        self.D_ref = np.mean(enrollment_data, axis=0)
        self.D_std = np.std(enrollment_data, axis=0)
        self.D_std = np.maximum(self.D_std, 1e-2)
        self.is_enrolled = True
        # This part is just for console output in the main class
        # print("✅ Enrollment Complete! Personalized profile created.")

    def _compute_anomaly_score(self, v):
        if np.count_nonzero(v) < 4:
            return None, None
        z_scores = np.abs((v - self.D_ref) / (self.D_std + 1e-8))
        base_score = np.mean(z_scores)
        if self.age >= 60:
            base_score *= 1.15
        return base_score, z_scores

    def _dynamic_rule_checks(self, v, loc_data):
        flags = []
        # Location checks (simplified for brevity)
        dist_login = self._haversine(*loc_data['last_login'], *loc_data['current_session'])
        if dist_login > 10:
            flags.append("Unusual login distance (>10km)")
        loc_data['last_login'] = loc_data['current_session']
        speed_kmh = self._haversine(*loc_data['prev_30s'], *loc_data['latest_30s']) / (30 / 3600)
        if speed_kmh > 120:
            flags.append("Abnormal session speed")
        # Behavior checks
        z_scores = np.abs((v - self.D_ref) / (self.D_std + 1e-8))
        if v[0] > 0 and z_scores[0] > 3.0: flags.append("Suspicious accuracy deviation")
        if v[1] > 0 and z_scores[1] > 3.0: flags.append("Suspicious flight time deviation")
        if v[5] > 0 and z_scores[5] > 3.0: flags.append("Suspicious error rate deviation")
        return flags, speed_kmh

    def _update_profile(self, v):
        score, _ = self._compute_anomaly_score(v)
        if score is None or score >= 1.5 or np.count_nonzero(v) < 6:
            return
        self.D_ref = self.alpha_mean * v + (1 - self.alpha_mean) * self.D_ref
        new_std = np.abs(v - self.D_ref)
        self.D_std = self.alpha_std * new_std + (1 - self.alpha_std) * self.D_std
        print("✔️ T1 Reference profile updated.")

    def authenticate(self, v, loc_data):
        if not self.is_enrolled:
            return {"decision": "ERROR: User is not enrolled."}
        an_score, z_scores = self._compute_anomaly_score(v)
        flags, speed = self._dynamic_rule_checks(v, loc_data)
        
        T_PASS, T_ESC_T2 = 0.8, 2.0
        decision = "UNKNOWN"

        if an_score is None:
            self.idle_count += 1
            decision = "SKIP INTERVAL (low activity)"
        else:
            self.idle_count = 0
            if an_score < T_PASS and not flags:
                decision = "PASS"
                self._update_profile(v)
            elif an_score >= T_ESC_T2 or len(flags) > 1:
                decision = "ESCALATE TO T3 (High Anomaly)"
            else:
                decision = "ESCALATE TO T2 (Medium Anomaly)"

        return { "decision": decision,
                "flags": flags}