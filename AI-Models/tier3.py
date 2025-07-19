import torch
import torch.nn as nn
import torch_geometric.transforms as T
from torch_geometric.data import HeteroData
from torch_geometric.nn import SAGEConv, to_hetero
import numpy as np
import random
import hashlib
from collections import deque

import networkx as nx
from pyvis.network import Network

def visualize_graph(graph_data, num_nodes_to_show=150, filename="fraud_graph.html"):
    """
    Creates an interactive HTML visualization of the heterogeneous graph for notebook environments.
    """
    print(f"\nCreating graph visualization with the first {num_nodes_to_show} users...")

    # Create a pyvis network, enabling notebook-specific output
    net = Network(height='800px', width='100%', notebook=True, cdn_resources='in_line') # <-- This makes it work in Kaggle

    # --- The rest of the function remains the same ---
    G = nx.Graph()
    users_to_show = list(range(min(num_nodes_to_show, len(graph_data['user'].x))))
    devices_in_graph, ips_in_graph = set(), set()

    # Add user nodes
    for user_id in users_to_show:
        is_fraud = graph_data['user'].y[user_id].item() == 1
        color = '#F44336' if is_fraud else '#2196F3'
        title = f"User {user_id}{' (Fraudulent)' if is_fraud else ''}"
        G.add_node(f"u{user_id}", label=f"U{user_id}", title=title, color=color, type='user', size=15)

    # Add edges and connected device/ip nodes
    for u, d in graph_data['user', 'uses', 'device'].edge_index.t().tolist():
        if u in users_to_show:
            G.add_edge(f"u{u}", f"d{d}")
            devices_in_graph.add(d)
    for u, i in graph_data['user', 'connects_from', 'ip'].edge_index.t().tolist():
        if u in users_to_show:
            G.add_edge(f"u{u}", f"i{i}")
            ips_in_graph.add(i)

    # Add the device and IP nodes themselves
    for device_id in devices_in_graph:
        G.add_node(f"d{device_id}", label=f"D{device_id}", title=f"Device {device_id}", color='#4CAF50', size=10)
    for ip_id in ips_in_graph:
        G.add_node(f"i{ip_id}", label=f"IP{ip_id}", title=f"IP {ip_id}", color='#FF9800', size=10)

    # Generate the visualization from the NetworkX graph
    net.from_nx(G)
    net.show(filename)
    print(f"Graph visualization rendered below. An HTML file was also saved to '{filename}'.")

    # --- 1. Data Security Utility ---
def hash_sensitive_data(data_string: str) -> str:
    """Hashes a string using SHA-256 for secure, anonymized use."""
    return hashlib.sha256(data_string.encode()).hexdigest()

# --- 2. Elaborate "Real-World" Dataset Generation ---
def create_elaborate_fraud_graph(num_users, num_devices, num_ips, num_transactions, fraud_ring_size):
    """Creates a more realistic heterogeneous graph with a simulated fraud ring."""
    print("Step 1: Generating elaborate synthetic graph data...")
    data = HeteroData()

    # --- Create Raw Identifiers ---
    # In the real world, these would come from your application logs.
    raw_user_ids = [f"user_{i}" for i in range(num_users)]
    raw_device_ids = [f"device-uuid-{random.randint(1000, 9999)}" for _ in range(num_devices)]
    raw_ip_addrs = [f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}" for _ in range(num_ips)]

    # --- Simulate Fraud Ring ---
    fraudulent_user_indices = random.sample(range(num_users), fraud_ring_size)
    # Fraudsters share from a small pool of compromised devices and IPs
    fraud_device_pool = random.sample(range(num_devices), 5)
    fraud_ip_pool = random.sample(range(num_ips), 5)
    
    # --- Map Raw IDs to Hashed IDs, and Hashed IDs to Integer Indices ---
    # This is a crucial step for privacy and for building the graph.
    all_hashed_devices = {hash_sensitive_data(did): i for i, did in enumerate(raw_device_ids)}
    all_hashed_ips = {hash_sensitive_data(ip): i for i, ip in enumerate(raw_ip_addrs)}

    # --- Node Features ---
    # User features (behavioral)
    data['user'].x = torch.rand(num_users, 10) 
    # Device features (e.g., is_rooted, os_type_one_hot)
    device_features = [[random.choice([0,1]), random.choice([0,1])] for _ in range(num_devices)]
    data['device'].x = torch.tensor(device_features, dtype=torch.float32)
    # IP features (e.g., is_proxy, is_datacenter)
    ip_features = [[random.choice([0,1]), random.choice([0,1])] for _ in range(num_ips)]
    data['ip'].x = torch.tensor(ip_features, dtype=torch.float32)
    # Transaction features (e.g., amount_normalized, time_since_last)
    data['transaction'].x = torch.rand(num_transactions, 2)
    
    # User labels (fraudulent or not)
    user_labels = torch.zeros(num_users, 1, dtype=torch.float32)
    user_labels[fraudulent_user_indices] = 1.0
    data['user'].y = user_labels

    # --- Create Edges using Hashed IDs ---
    edge_user_device, edge_user_ip, edge_user_transaction = [], [], []
    
    for i in range(num_users):
        # Select device and IP based on whether the user is a fraudster
        if i in fraudulent_user_indices:
            device_idx = random.choice(fraud_device_pool)
            ip_idx = random.choice(fraud_ip_pool)
        else:
            device_idx = random.randint(0, num_devices - 1)
            ip_idx = random.randint(0, num_ips - 1)
        
        edge_user_device.append([i, device_idx])
        edge_user_ip.append([i, ip_idx])
    
    # Link users to transactions
    for t in range(num_transactions):
        user_idx = random.choice(fraudulent_user_indices) if random.random() < 0.5 else random.randint(0, num_users - 1)
        edge_user_transaction.append([user_idx, t])
        # Make fraudulent transactions have suspiciously low amounts
        if user_idx in fraudulent_user_indices:
            data['transaction'].x[t, 0] = random.uniform(0.01, 0.05) # small amounts
            
    data['user', 'uses', 'device'].edge_index = torch.tensor(edge_user_device).t().contiguous()
    data['user', 'connects_from', 'ip'].edge_index = torch.tensor(edge_user_ip).t().contiguous()
    data['user', 'performs', 'transaction'].edge_index = torch.tensor(edge_user_transaction).t().contiguous()

    # Create reverse edges and split masks
    data = T.ToUndirected()(data)
    data = T.RandomNodeSplit(split="train_rest", num_val=0.2, num_test=0.2)(data)
    print("Elaborate graph data created successfully.")
    return data

# --- 3. GNN Model Definitions ---
class GNNEncoder(nn.Module):
    def __init__(self, hidden_channels):
        super().__init__()
        self.conv1 = SAGEConv((-1, -1), hidden_channels)
        self.conv2 = SAGEConv((-1, -1), hidden_channels)
    def forward(self, x, edge_index):
        x = self.conv1(x, edge_index).relu(); return self.conv2(x, edge_index)

class HeteroGNN(nn.Module):
    def __init__(self, hidden_channels, out_channels, metadata):
        super().__init__()
        self.gnn_encoder = GNNEncoder(hidden_channels)
        self.hetero_gnn = to_hetero(self.gnn_encoder, metadata, aggr='sum')
        self.classifier = nn.Linear(hidden_channels, out_channels)
    def forward(self, x_dict, edge_index_dict):
        embs = self.hetero_gnn(x_dict, edge_index_dict); return self.classifier(embs['user'])

# --- 4. Training and Saving Script ---

# Generate the elaborate dataset
graph_data = create_elaborate_fraud_graph(
    num_users=1000, num_devices=800, num_ips=700,
    num_transactions=2000, fraud_ring_size=40
)
metadata = graph_data.metadata()
print("\nGraph Metadata (Node & Edge Types):\n", metadata)

# Initialize Model, Optimizer, and Loss
print("\nStep 2: Initializing HeteroGNN model...")
model = HeteroGNN(hidden_channels=64, out_channels=1, metadata=metadata)
optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
loss_fn = torch.nn.BCEWithLogitsLoss()

# Training Loop
print("\nStep 3: Starting GNN training...")
model.train()
for epoch in range(101):
    optimizer.zero_grad()
    out = model(graph_data.x_dict, graph_data.edge_index_dict)
    mask = graph_data['user'].train_mask
    loss = loss_fn(out[mask], graph_data['user'].y[mask])
    loss.backward()
    optimizer.step()
    if epoch % 20 == 0:
        print(f"Epoch {epoch:03d}, Loss: {loss.item():.4f}")
print("Training complete.")

# --- At the end of your GNN training script ---

# Save the GNN model's state dictionary
MODEL_SAVE_PATH = '/kaggle/working/t3_gnn_model.pth'
torch.save(model.state_dict(), MODEL_SAVE_PATH)
print(f"\n✅ Trained GNN model saved to '{MODEL_SAVE_PATH}'")

# --- ADD THIS BLOCK TO SAVE THE GRAPH DATA ---
GRAPH_DATA_SAVE_PATH = '/kaggle/working/graph_data.pt'
torch.save(graph_data, GRAPH_DATA_SAVE_PATH)
print(f"✅ Graph data object saved to '{GRAPH_DATA_SAVE_PATH}'")


import torch
import torch.nn as nn
import numpy as np
import random
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import StandardScaler

# ---Model 2: The Enhanced TemporalDriftTracker Model ---
class TemporalDriftTracker(nn.Module):
    """
    An enhanced drift tracker using a probabilistic LSTM with an attention mechanism.
    It predicts a distribution (mean and variance) for the next behavior vector.
    """
    def __init__(self, input_dim=10, hidden_dim=64, num_layers=2):
        super().__init__()
        self.input_dim = input_dim
        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers, batch_first=True, dropout=0.2)
        self.attention_net = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.Tanh(),
            nn.Linear(32, 1)
        )
        self.fc_mu = nn.Linear(hidden_dim, input_dim)
        self.fc_log_var = nn.Linear(hidden_dim, input_dim)

    def forward(self, sequence):
        lstm_out, _ = self.lstm(sequence)
        attention_weights = torch.softmax(self.attention_net(lstm_out), dim=1)
        context_vector = torch.sum(attention_weights * lstm_out, dim=1)
        predicted_mu = self.fc_mu(context_vector)
        predicted_log_var = self.fc_log_var(context_vector)
        return predicted_mu, predicted_log_var

# --- Realistic Time-Series Dataset Generation ---
def create_temporal_dataset(num_users=100, history_length=100, seq_len=15):
    """
    Generates realistic user histories with gradual drift and abrupt shifts.
    """
    print("Step 1: Generating realistic time-series dataset...")
    all_sequences = []
    all_labels = []
    
    base_profile_template = np.array([90, 300, 5, 320, 85, 5, 50, 110, 160, 4])
    
    for _ in range(num_users):
        user_history = []
        current_profile = base_profile_template + np.random.normal(0, base_profile_template * 0.1)
        
        # Introduce an abrupt shift for ~30% of users
        shift_point = random.randint(history_length // 2, history_length) if random.random() < 0.3 else -1

        for i in range(history_length):
            # Apply gradual drift (random walk)
            current_profile += np.random.normal(0, base_profile_template * 0.005)
            
            # Apply the abrupt shift if the point is reached
            if i == shift_point:
                shift_vector = np.random.normal(0, base_profile_template * 0.15)
                current_profile += shift_vector
                print(f"  -> Simulating abrupt shift for a user at step {i}")

            # Add session noise to the current profile
            session_noise = np.random.normal(0, base_profile_template * 0.02)
            session_vector = np.maximum(current_profile + session_noise, 0)
            user_history.append(session_vector)
            
        # Create overlapping sequences from the user's history
        for i in range(len(user_history) - seq_len):
            sequence = user_history[i : i + seq_len]
            label = user_history[i + seq_len]
            all_sequences.append(sequence)
            all_labels.append(label)

    print("Dataset generation complete.")
    return np.array(all_sequences, dtype=np.float32), np.array(all_labels, dtype=np.float32)

# --- PyTorch Dataset and Loss Function ---
class SequenceDataset(Dataset):
    def __init__(self, sequences, labels, scaler):
        self.sequences = torch.tensor(scaler.transform(sequences.reshape(-1, 10)).reshape(sequences.shape), dtype=torch.float32)
        self.labels = torch.tensor(scaler.transform(labels), dtype=torch.float32)
    def __len__(self):
        return len(self.sequences)
    def __getitem__(self, idx):
        return self.sequences[idx], self.labels[idx]

def gaussian_nll_loss(mu, log_var, y_true):
    """Calculates the Gaussian Negative Log-Likelihood loss."""
    return torch.mean(0.5 * (log_var + torch.pow(y_true - mu, 2) / torch.exp(log_var)))

# --- Main Training Execution ---
# 1. Generate Data
sequences, labels = create_temporal_dataset()
# Flatten data for scaler, then reshape back
scaler = StandardScaler().fit(sequences.reshape(-1, 10))

# 2. Create DataLoader
train_dataset = SequenceDataset(sequences, labels, scaler)
train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True)

# 3. Initialize Model and Optimizer
model = TemporalDriftTracker()
optimizer = torch.optim.AdamW(model.parameters(), lr=0.001)

# 4. Training Loop
print("\nStep 2: Starting model training...")
model.train()
for epoch in range(50): # A decent number of epochs for convergence
    total_loss = 0.0
    for seq_batch, label_batch in train_loader:
        optimizer.zero_grad()
        # The model returns two outputs
        pred_mu, pred_log_var = model(seq_batch)
        # Use the custom NLL loss function
        loss = gaussian_nll_loss(pred_mu, pred_log_var, label_batch)
        loss.backward()
        optimizer.step()
        total_loss += loss.item()
    avg_loss = total_loss / len(train_loader)
    print(f"Epoch [{epoch+1:02d}/50], Average NLL Loss: {avg_loss:.4f}")
print("Training complete.")

# --- 5. Test the Trained Model ---
print("\nStep 3: Testing the trained model...")
model.eval()

# Get a test sequence and label from the dataset
test_seq, test_label = train_dataset[0]
test_seq = test_seq.unsqueeze(0) # Add batch dimension

with torch.no_grad():
    mu, log_var = model(test_seq)
    
# Inverse transform to see the real values
mu_real = scaler.inverse_transform(mu.numpy())
log_var_real = log_var.numpy() # Log variance doesn't need inverse transform
label_real = scaler.inverse_transform(test_label.numpy().reshape(1, -1))

print(f"Sample Test Label (Actual Next Vector):\n {np.round(label_real, 2)}")
print(f"\nModel Prediction (Mean):\n {np.round(mu_real, 2)}")
print(f"\nModel Uncertainty (Log Variance):\n {np.round(log_var_real, 2)}")





# --- Add this block after the training loop ---

# Define the file path for the saved model
MODEL_SAVE_PATH = 'temporal_drift_tracker.pth'

# Save the model's state dictionary
torch.save(model.state_dict(), MODEL_SAVE_PATH)

print(f"\n✅ Similarity engine model saved to '{MODEL_SAVE_PATH}'")





import torch
import torch.nn as nn
import numpy as np
import random
from sklearn.preprocessing import StandardScaler
from torch.utils.data import Dataset, DataLoader

# --- The Robust T3 SimilarityEngine Model ---
class SimilarityEngine(nn.Module):
    """An enhanced similarity engine using a Siamese network architecture."""
    def __init__(self, input_dim=10, embedding_dim=32, hidden_dim=128):
        super().__init__()
        # Shared network to create a meaningful embedding of a behavior vector
        self.embedding_net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim), nn.LayerNorm(hidden_dim), nn.GELU(),
            nn.Dropout(0.3), nn.Linear(hidden_dim, hidden_dim // 2),
            nn.LayerNorm(hidden_dim // 2), nn.GELU(),
            nn.Linear(hidden_dim // 2, embedding_dim)
        )
        # Decision network to compare the embeddings
        self.decision_head = nn.Sequential(
            nn.Linear(embedding_dim * 4, hidden_dim), nn.GELU(), nn.Dropout(0.5),
            nn.Linear(hidden_dim, hidden_dim // 2), nn.GELU(),
            nn.Linear(hidden_dim // 2, 1), nn.Sigmoid()
        )

    def forward(self, v_ref, v_test):
        e_ref = self.embedding_net(v_ref)
        e_test = self.embedding_net(v_test)
        e_diff = torch.abs(e_ref - e_test)
        e_prod = e_ref * e_test
        combined = torch.cat([e_ref, e_test, e_diff, e_prod], dim=1)
        return self.decision_head(combined)

# --- Realistic Data Generation Logic ---
def create_training_dataset_with_hard_negatives(num_users=200, samples_per_user=20):
    print("Step 1: Generating realistic dataset with hard negatives...")
    # Define archetypes: [accuracy, flight_time, errors, typing_speed, etc...]
    archetypes = {
        "fast_accurate": np.array([95, 280, 3, 380, 90, 3, 40, 120, 130, 2]),
        "slow_deliberate": np.array([98, 450, 1, 200, 95, 1, 70, 80, 180, 1]),
        "average_mobile": np.array([90, 350, 6, 300, 80, 6, 55, 100, 150, 5]),
        "fast_sloppy": np.array([85, 260, 10, 400, 75, 10, 35, 130, 120, 8])
    }
    archetype_keys = list(archetypes.keys())
    
    # Store all user data, grouped by archetype
    user_data_by_archetype = {key: [] for key in archetype_keys}
    all_samples = []

    # Create user profiles based on archetypes
    for i in range(num_users):
        arch_key = random.choice(archetype_keys)
        # Personal profile is a slight variation of the archetype
        personalization_noise = np.random.normal(0, archetypes[arch_key] * 0.05)
        base_profile = archetypes[arch_key] + personalization_noise
        
        # Generate session samples for this user
        session_jitter_std = np.array([2.5, 15, 1.5, 20, 5, 3, 5, 20, 10, 2])
        user_samples = [np.maximum(base_profile + np.random.normal(0, session_jitter_std), 0) for _ in range(samples_per_user)]
        
        user_data_by_archetype[arch_key].append(user_samples)
        all_samples.extend(user_samples)

    # Create training pairs
    training_pairs = []
    for arch_key, user_list in user_data_by_archetype.items():
        for user_index, user_samples in enumerate(user_list):
            for i in range(len(user_samples)):
                # 1. Positive pair (same user, different samples)
                v_ref = user_samples[i]
                v_test_pos = user_samples[random.choice([j for j in range(len(user_samples)) if i != j])]
                training_pairs.append((v_ref, v_test_pos, 1.0))

                # 2. Hard Negative pair (different users, same archetype)
                if len(user_list) > 1:
                    hard_neg_user_index = random.choice([j for j in range(len(user_list)) if j != user_index])
                    v_test_hard_neg = random.choice(user_list[hard_neg_user_index])
                    training_pairs.append((v_ref, v_test_hard_neg, 0.0))

    random.shuffle(training_pairs)
    print("Dataset generation complete.")
    return training_pairs, all_samples

# --- PyTorch Dataset and DataLoader ---
class SimilarityDataset(Dataset):
    def __init__(self, pairs, scaler):
        self.pairs = pairs
        self.scaler = scaler
    def __len__(self):
        return len(self.pairs)
    def __getitem__(self, idx):
        v_ref, v_test, label = self.pairs[idx]
        v_ref_norm = self.scaler.transform(v_ref.reshape(1, -1)).flatten()
        v_test_norm = self.scaler.transform(v_test.reshape(1, -1)).flatten()
        return (torch.tensor(v_ref_norm, dtype=torch.float32),
                torch.tensor(v_test_norm, dtype=torch.float32),
                torch.tensor(label, dtype=torch.float32))

# --- Main Training Execution ---
# 1. Generate Data
pairs, all_samples = create_training_dataset_with_hard_negatives()

# 2. Normalize Data
scaler = StandardScaler().fit(all_samples)
train_dataset = SimilarityDataset(pairs, scaler)
train_loader = DataLoader(train_dataset, batch_size=128, shuffle=True)

# 3. Initialize Model, Optimizer, and Loss
model = SimilarityEngine()
optimizer = torch.optim.AdamW(model.parameters(), lr=0.001)
loss_fn = nn.BCELoss()

# 4. Training Loop
print("\nStep 2: Starting model training...")
model.train()
for epoch in range(100): # A longer training loop is beneficial
    total_loss = 0.0
    for v_ref_b, v_test_b, label_b in train_loader:
        optimizer.zero_grad()
        predictions = model(v_ref_b, v_test_b)
        loss = loss_fn(predictions, label_b.unsqueeze(1))
        loss.backward()
        optimizer.step()
        total_loss += loss.item()
    avg_loss = total_loss / len(train_loader)
    print(f"Epoch [{epoch+1:02d}/100], Average Loss: {avg_loss:.4f}")
print("Training complete.")

# --- 5. Test the Trained Model ---
print("\nStep 3: Testing the trained model...")
model.eval()

# Create some test samples
base_user = create_training_dataset_with_hard_negatives(num_users=2, samples_per_user=2)[0]
v_user1_sample1 = base_user[0][0]
v_user1_sample2 = base_user[0][1] # Positive
v_user2_sample1 = base_user[2][0] # Hard Negative

# Normalize test samples
v1_s1_norm = torch.tensor(scaler.transform(v_user1_sample1.reshape(1, -1)).flatten(), dtype=torch.float32).unsqueeze(0)
v1_s2_norm = torch.tensor(scaler.transform(v_user1_sample2.reshape(1, -1)).flatten(), dtype=torch.float32).unsqueeze(0)
v2_s1_norm = torch.tensor(scaler.transform(v_user2_sample1.reshape(1, -1)).flatten(), dtype=torch.float32).unsqueeze(0)

with torch.no_grad():
    score_positive = model(v1_s1_norm, v1_s2_norm).item()
    score_hard_negative = model(v1_s1_norm, v2_s1_norm).item()

print(f"Similarity Score (Genuine Pair): {score_positive:.2%}")
print(f"Similarity Score (Hard Negative Pair): {score_hard_negative:.2%}")





# --- Add this block after the training loop ---

# Define the file path for the saved model
MODEL_SAVE_PATH = 'SimilarityEnginge.pth'

# Save the model's state dictionary
torch.save(model.state_dict(), MODEL_SAVE_PATH)

print(f"\n✅ Similarity engine model saved to '{MODEL_SAVE_PATH}'")





# --- Final T3 Orchestrator ---
class Tier3Authenticator:
    """Orchestrates the full 3-component T3 analysis by loading pre-trained models."""
    def __init__(self, gnn_graph_data, user_id_to_idx_map):
        # The GNN model needs the graph metadata for initialization
        gnn_metadata = gnn_graph_data.metadata()
        self.gnn_model = HeteroGNN(hidden_channels=64, out_channels=1, metadata=gnn_metadata)
        # THE FIX: Add weights_only=False
        self.gnn_model.load_state_dict(torch.load('/kaggle/working/t3_gnn_model.pth', weights_only=False))
        print("Pretrained t3_gnn_model loaded")
        self.gnn_model.eval()
        self.gnn_graph = gnn_graph_data
        self.user_id_to_idx = user_id_to_idx_map

        # Load Temporal Drift Tracker
        self.drift_tracker = TemporalDriftTracker()
        # THE FIX: Add weights_only=False
        self.drift_tracker.load_state_dict(torch.load('/kaggle/working/temporal_drift_tracker.pth', weights_only=False))
        print("Pretrained temporal_drift_tracker model loaded")
        self.drift_tracker.eval()
        
        # Load Similarity Engine
        self.similarity_engine = SimilarityEngine()
        # THE FIX: Add weights_only=False
        self.similarity_engine.load_state_dict(torch.load('/kaggle/working/SimilarityEnginge.pth', weights_only=False))
        print("Pretrained SimilarityEnginge model loaded")
        self.similarity_engine.eval()
        
        self.user_history = {}
        print("✅ Tier 3 Authenticator initialized with all 3 pre-trained models.")

    # ... all other methods of the class remain the same ...
    def enroll_user_history(self, user_id, historical_vectors):
        self.user_history[user_id] = deque(historical_vectors, maxlen=20)

    def _get_gnn_risk(self, user_id):
        if user_id not in self.user_id_to_idx: return 0.1
        user_idx = self.user_id_to_idx[user_id]
        with torch.no_grad():
            logits = self.gnn_model(self.gnn_graph.x_dict, self.gnn_graph.edge_index_dict)
            probs = torch.sigmoid(logits)
            return probs[user_idx].item()

    def authenticate(self, user_id, v_test, v_ref):
        print(f"\n--- T3 Deep Investigation for User: {user_id} ---")
        
        gnn_risk = self._get_gnn_risk(user_id)
        print(f"GNN Risk Score: {gnn_risk:.2f}")

        history = self.user_history.get(user_id)
        drift_anomaly = 0.1
        if history and len(history) > 5:
            with torch.no_grad():
                sequence = torch.tensor(np.array(list(history)), dtype=torch.float32).unsqueeze(0)
                mu, log_var = self.drift_tracker(sequence)
                nll = 0.5 * (log_var + torch.pow(torch.tensor(v_test) - mu, 2) / torch.exp(log_var))
                drift_anomaly = min(torch.mean(nll).item() / 5.0, 1.0)
        print(f"Drift Anomaly Score: {drift_anomaly:.2f}")

        with torch.no_grad():
            v_ref_t = torch.tensor(v_ref, dtype=torch.float32).unsqueeze(0)
            v_test_t = torch.tensor(v_test, dtype=torch.float32).unsqueeze(0)
            sim_score = self.similarity_engine(v_ref_t, v_test_t).item()
        similarity_risk = 1.0 - sim_score
        print(f"Similarity Risk Score: {similarity_risk:.2f}")

        weights = {'gnn': 0.5, 'drift': 0.2, 'similarity': 0.3}
        final_score = gnn_risk * weights['gnn'] + drift_anomaly * weights['drift'] + similarity_risk * weights['similarity']
        print(f"Final Aggregated Risk Score: {final_score:.2f}")

        if final_score > 0.6: decision = "BLOCK - HIGH RISK"
        elif final_score > 0.35: decision = "MANUAL REVIEW"
        else: decision = "PASS (T3 Verified)"
        
        if user_id in self.user_history: self.user_history[user_id].append(v_test)
        return {"decision": decision, "final_score": final_score}
    




    