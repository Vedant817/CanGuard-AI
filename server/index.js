require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const behaviorRoutes = require('./routes/behavior'); 
const userRoutes = require('./routes/user');
const streamsRoutes = require('./routes/streams');
const debugRoutes = require('./routes/debug');

const app = express();
const PORT = process.env.PORT || 3001;
connectDB();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes); 
app.use('/api/behavior', behaviorRoutes);
app.use('/api/user', userRoutes);
app.use('/api/streams', streamsRoutes);
app.use('/api/debug', debugRoutes);

// Health check endpoint for ceramic service
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'CanGuard-AI Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/', (req, res) => {
  res.send('Auth API Running');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
