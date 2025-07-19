# CanGuard-AI/AI-Models/auth_orchestrator.py

import numpy as np
import torch
import joblib
from collections import deque

# Ensure all your model class definitions are available
from ai_models.tier1 import Tier1Authenticator
from ai_models.tier2 import UnifiedSiameseVerifier
from ai_models.tier3 import Tier3Authenticator, HeteroGNN, GNNEncoder, TemporalDriftTracker, SimilarityEngine

class UnifiedAuthenticator:
    """
    The central orchestrator that loads all models and handles authentication requests.
    """
    def __init__(self):
        # In-memory storage for user profiles (in production, use a database like Redis)
        self.user_profiles = {}

        # --- Load T2 Models & Scaler ---
        self.scaler = joblib.load('ai_models/t2_scaler.joblib')
        self.t2_model = UnifiedSiameseVerifier(context_dim=5)
        self.t2_model.load_state_dict(torch.load('ai_models/t2_unified_verifier.pth', weights_only=False))
        self.t2_model.eval()

        # --- Load T3 Models & Graph Data ---
        graph_data = torch.load('ai_models/graph_data.pt', weights_only=False)
        user_map = {f"user_id_{i}": i for i in range(graph_data['user'].x.shape[0])}
        self.t3 = Tier3Authenticator(graph_data, user_map)
        
        print("✅ Unified Authenticator is ready and all models are loaded.")

    def enroll_user(self, user_id, age, enrollment_data):
        """Creates and stores a new user profile."""
        if user_id in self.user_profiles:
            return # User already enrolled

        print(f"Enrolling new user: {user_id}")
        t1_authenticator = Tier1Authenticator(age=age)
        t1_authenticator.enroll(enrollment_data['t1_samples'])
        
        # Enroll user's history in T3's drift tracker
        self.t3.enroll_user_history(user_id, enrollment_data['t3_history'])
        
        self.user_profiles[user_id] = {'t1': t1_authenticator}

    def _create_context_vector(self, v_ref, v_test, age, t1_score, location_info):
        """Builds the dynamic context vector for T2."""
        is_traveling = location_info.get("is_traveling", False)
        distance = np.linalg.norm(v_ref - v_test) / (np.linalg.norm(v_ref) + 1e-8)
        
        return np.array([distance, age / 100.0, t1_score, float(is_traveling), 0.0])

    def authenticate_session(self, request_data):
        """
        Processes a single authentication request from the React Native client.
        """
        user_id = request_data['user_id']
        age = request_data['age']
        v_test = np.array(request_data['behavioral_vector'])
        location_info = request_data['location_info']

        # Ensure user is enrolled
        if user_id not in self.user_profiles:
            # For this demo, we'll enroll them on the first call
            # In production, enrollment should be a separate, secure process
            enrollment_data = {
                "t1_samples": [np.array(v_test) for _ in range(5)],
                "t3_history": [np.array(v_test) for _ in range(15)]
            }
            self.enroll_user(user_id, age, enrollment_data)

        # Retrieve the user's personal T1 instance
        user_t1 = self.user_profiles[user_id]['t1']
        v_ref = user_t1.D_ref
        
        # --- Run T1 Check ---
        t1_result = user_t1.authenticate(v_test, location_info)
        decision = t1_result["decision"]
        
        if "PASS" in decision or "SKIP" in decision:
            return {"tier": "T1", "decision": decision}

        # --- Escalate to T2 ---
        if "ESCALATE TO T2" in decision:
            context_vec = self._create_context_vector(v_ref, v_test, age, t1_result.get('score', 1.5), location_info)
            v_ref_norm = self.scaler.transform(v_ref.reshape(1, -1))
            v_test_norm = self.scaler.transform(v_test.reshape(1, -1))
            
            v_ref_t = torch.tensor(v_ref_norm, dtype=torch.float32)
            v_test_t = torch.tensor(v_test_norm, dtype=torch.float32)
            context_t = torch.tensor(context_vec, dtype=torch.float32).unsqueeze(0)
            
            with torch.no_grad():
                t2_score = self.t2_model(v_ref_t, v_test_t, context_t).item()

            if t2_score >= 0.8:
                return {"tier": "T2", "decision": "PASS", "score": t2_score}
            decision = "ESCALATE TO T3"
        
        # --- Escalate to T3 ---
        if "ESCALATE TO T3" in decision:
            final_t3 = self.t3.authenticate(user_id, v_test, v_ref)
            return {"tier": "T3", **final_t3}

        return {"tier": "System", "decision": "UNKNOWN_STATE"}