const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const behaviorRoutes = require('./routes/behavior'); 
const userRoutes = require('./routes/user'); 

const app = express();
const PORT = process.env.PORT || 3001;

require('dotenv').config();
connectDB();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes); 
app.use('/api/behavior', behaviorRoutes);
app.use('/api/user', userRoutes);

app.get('/', (req, res) => {
  res.send('Auth API Running');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
