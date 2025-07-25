import numpy as np
import random
from sklearn.preprocessing import StandardScaler

# --- Configuration ---
NUM_USERS = 100
SAMPLES_PER_USER = 50
FEATURE_NAMES = [
    "accuracy", "flight_time", "errors", "typing_speed", "consistency", 
    "error_rate", "avg_key_hold", "keystrokes", "avg_latency", "backspace_count"
]

def create_base_profile():
    """Generates a unique base behavioral profile for a single user."""
    return np.array([
        random.uniform(85, 98),       # accuracy (%)
        random.uniform(250, 450),     # flight_time (ms)
        random.uniform(2, 8),         # errors
        random.uniform(250, 400),     # typing_speed (chars per minute)
        random.uniform(70, 95),       # consistency (%)
        random.uniform(2, 15),        # error_rate (%)
        random.uniform(30, 80),       # avg_key_hold (ms)
        random.uniform(50, 150),      # keystrokes in interval
        random.uniform(120, 200),     # avg_latency (ms)
        random.uniform(1, 10)         # backspace_count
    ])

def generate_sample_for_user(base_profile):
    """Creates a single behavioral sample with realistic noise."""
    # Jitter represents the typical standard deviation for each feature
    jitter_std = np.array([
        2.5, 15.0, 1.5, 20.0, 5.0, 
        3.0, 5.0, 20.0, 10.0, 2.0
    ])
    noise = np.random.normal(0, jitter_std)
    sample = base_profile + noise
    # Ensure values are non-negative
    return np.maximum(sample, 0)

def create_context_vector(v_ref, v_test, age, is_impostor):
    """Creates a plausible context vector for a given pair."""
    # Simulate a T1 anomaly score - it should be higher for impostors
    distance = np.linalg.norm(v_ref - v_test) / np.linalg.norm(v_ref)
    if is_impostor:
        t1_anomaly_score = random.uniform(2.0, 4.5) + distance * 2
    else:
        t1_anomaly_score = random.uniform(0.5, 1.5) + distance
    
    return np.array([
        distance,
        age / 100.0, # Normalize age
        t1_anomaly_score,
        float(random.choice([0, 1])) if t1_anomaly_score > 2.0 else 0.0, # travel_flag
        float(random.choice([0, 1])) if age > 70 else 0.0 # disability_flag
    ])

# --- 1. Generate Raw User Data ---
print("Step 1: Generating raw user profiles and samples...")
all_user_data = {}
all_user_ages = {}
for user_id in range(NUM_USERS):
    base_profile = create_base_profile()
    all_user_data[user_id] = [generate_sample_for_user(base_profile) for _ in range(SAMPLES_PER_USER)]
    all_user_ages[user_id] = random.randint(18, 80)
print(f"Generated data for {NUM_USERS} users with {SAMPLES_PER_USER} samples each.")

# --- 2. Create Training Pairs ---
print("\nStep 2: Creating positive and negative training pairs...")
dataset = []
user_ids = list(all_user_data.keys())

for user_id in user_ids:
    for i in range(SAMPLES_PER_USER):
        v_ref = all_user_data[user_id][i]
        age = all_user_ages[user_id]

        # Create a positive pair (same user)
        positive_index = random.choice([j for j in range(SAMPLES_PER_USER) if i != j])
        v_test_pos = all_user_data[user_id][positive_index]
        context_pos = create_context_vector(v_ref, v_test_pos, age, is_impostor=False)
        dataset.append((v_ref, v_test_pos, context_pos, 1.0)) # Label 1.0 for genuine

        # Create a negative pair (impostor)
        impostor_id = random.choice([uid for uid in user_ids if uid != user_id])
        impostor_index = random.randint(0, SAMPLES_PER_USER - 1)
        v_test_neg = all_user_data[impostor_id][impostor_index]
        context_neg = create_context_vector(v_ref, v_test_neg, age, is_impostor=True)
        dataset.append((v_ref, v_test_neg, context_neg, 0.0)) # Label 0.0 for impostor

random.shuffle(dataset)
print(f"Created a balanced dataset with {len(dataset)} pairs.")

# --- 3. Normalize the Behavioral Data ---
print("\nStep 3: Normalizing behavioral data...")
# Extract all behavior vectors for fitting the scaler
all_vectors = [pair[0] for pair in dataset] + [pair[1] for pair in dataset]
scaler = StandardScaler()
scaler.fit(all_vectors)

# Apply the scaler to the dataset
normalized_dataset = []
for v_ref, v_test, context, label in dataset:
    v_ref_norm = scaler.transform(v_ref.reshape(1, -1)).flatten()
    v_test_norm = scaler.transform(v_test.reshape(1, -1)).flatten()
    normalized_dataset.append((v_ref_norm, v_test_norm, context, label))

print("Normalization complete. The dataset is ready for training.")

# --- 4. Display Sample Data ---
print("\n--- Sample of Final Dataset (Normalized) ---")
for i in range(3):
    v_ref, v_test, context, label = normalized_dataset[i]
    print(f"\nPair {i+1}:")
    print(f"  Label: {'Genuine' if label == 1.0 else 'Impostor'}")
    print(f"  v_ref (norm): {np.round(v_ref, 2)}")
    print(f"  v_test (norm): {np.round(v_test, 2)}")
    print(f"  Context: {np.round(context, 2)}")

# The 'normalized_dataset' is now ready to be converted to PyTorch Tensors
# and fed into your UnifiedSiameseVerifier model for training.


import torch
import torch.nn as nn

class UnifiedSiameseVerifier(nn.Module):
    def __init__(self, input_dim=10, context_dim=5, embedding_dim=32):
        super().__init__()
        
        # 1. Embedding Backbone (processes behavior vectors)
        # Shared network to create embeddings from the 10-D feature vectors
        self.embedding_net = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.LayerNorm(128),
            nn.GELU(),
            nn.Dropout(0.3),
            nn.Linear(128, 64),
            nn.LayerNorm(64),
            nn.GELU(),
            nn.Dropout(0.3),
            nn.Linear(64, embedding_dim)
        )
        
        # 2. Context Processor (processes context data)
        self.context_net = nn.Sequential(
            nn.Linear(context_dim, 16),
            nn.GELU()
        )
        
        # 3. Decision Head (combines everything to make a final decision)
        # The input size is calculated from the concatenated vector:
        # embedding_dim * 4 (ref, test, diff, product) + 16 (context)
        combined_input_size = (embedding_dim * 4) + 16
        
        self.decision_head = nn.Sequential(
            nn.Linear(combined_input_size, 64),
            nn.GELU(),
            nn.Dropout(0.5),
            nn.Linear(64, 1),
            nn.Sigmoid() # Outputs a probability score between 0 and 1
        )

    def forward(self, v_ref, v_test, context_vec):
        # Pass both behavior vectors through the same embedding network
        e_ref = self.embedding_net(v_ref)
        e_test = self.embedding_net(v_test)
        
        # Process the context vector
        e_context = self.context_net(context_vec)
        
        # Calculate difference and product of embeddings
        e_diff = torch.abs(e_ref - e_test)
        e_prod = e_ref * e_test
        
        # Combine all information into a single vector
        combined_vector = torch.cat([e_ref, e_test, e_diff, e_prod, e_context], dim=-1)
        
        # Get the final similarity score
        return self.decision_head(combined_vector)



import torch
from torch.utils.data import Dataset, DataLoader

class BehaviorDataset(Dataset):
    """Custom PyTorch Dataset for the behavior pairs."""
    def __init__(self, data):
        self.data = data

    def __len__(self):
        # Returns the total number of pairs in the dataset
        return len(self.data)

    def __getitem__(self, idx):
        # Retrieves one pair of data by index and converts it to Tensors
        v_ref, v_test, context, label = self.data[idx]
        
        return (
            torch.tensor(v_ref, dtype=torch.float32),
            torch.tensor(v_test, dtype=torch.float32),
            torch.tensor(context, dtype=torch.float32),
            torch.tensor(label, dtype=torch.float32)
        )
    

# Assume 'normalized_dataset' is the list generated from the previous script

# Instantiate the Dataset
train_dataset = BehaviorDataset(normalized_dataset)

# Create the DataLoader
BATCH_SIZE = 64
train_loader = DataLoader(
    dataset=train_dataset,
    batch_size=BATCH_SIZE,
    shuffle=True  # Shuffle data every epoch for better training
)


# --- Full Training Script ---
# (Place this after the code from steps 1 and 2)

# Model, optimizer, and loss function (as you defined)
model = UnifiedSiameseVerifier()
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
loss_fn = nn.BCELoss()

# Number of training epochs
NUM_EPOCHS = 15

print("\n--- Starting Model Training ---")

# Set the model to training mode
model.train()

for epoch in range(NUM_EPOCHS):
    total_loss = 0.0
    
    # The DataLoader provides batches of data automatically
    for i, (v_ref_batch, v_test_batch, context_batch, label_batch) in enumerate(train_loader):
        
        # 1. Zero the gradients
        optimizer.zero_grad()
        
        # 2. Forward pass: compute predicted y by passing inputs to the model
        predictions = model(v_ref_batch, v_test_batch, context_batch)
        
        # 3. Compute loss
        # We unsqueeze the label_batch to match the prediction's shape ([BATCH_SIZE, 1])
        loss = loss_fn(predictions, label_batch.unsqueeze(1))
        
        # 4. Backward pass: compute gradient of the loss with respect to model parameters
        loss.backward()
        
        # 5. Call step(): Causes the optimizer to take a step that updates the model's parameters
        optimizer.step()
        
        total_loss += loss.item()
        
    avg_loss = total_loss / len(train_loader)
    print(f"Epoch [{epoch+1}/{NUM_EPOCHS}], Average Loss: {avg_loss:.4f}")

print("\n--- Training Complete --- ✅")


# Define the file path for the saved model
MODEL_SAVE_PATH = '/kaggle/working/t2_unified_verifier.pth'

# Save the model's state dictionary
torch.save(model.state_dict(), MODEL_SAVE_PATH)

print(f"\n✅ T2 model saved to '{MODEL_SAVE_PATH}'")

# It's also critical to save the scaler used for normalization
import joblib
SCALER_SAVE_PATH = '/kaggle/working/t2_scaler.joblib'
joblib.dump(scaler, SCALER_SAVE_PATH)
print(f"✅ T2 data scaler saved to '{SCALER_SAVE_PATH}'")


