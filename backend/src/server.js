require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const Redis = require('ioredis');
const initializeSocket = require('./sockets/socket');
const mongoose = require('mongoose');
const User = require('./models/User');

const REQUIRED_ENV = ['REDIS_HOST'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const PORT = process.env.PORT || 3000;
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_URL = `redis://${REDIS_HOST}:6379`;

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('🔥 MongoDB Connection Error:', err));

const server = http.createServer(app);

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.post('/test-user', async (req, res) => {
  try {
    const { name, fcmToken, phone } = req.body;

    // Create a new user based on your User.js schema
    const newUser = new User({
      // We use the ID of one of your fake helpers from seedFakeHelpers.js 
      // so the proximity search actually finds them!
      _id: "helper_001", // Forcing the ID to match your simulation
      name: name || "Alex R. (Test Helper)",
      fcmToken: fcmToken || "dummy_firebase_token_123",
      emergencyContacts: [{
        name: "Emergency Contact 1",
        phoneNumber: phone || "+15551234567"
      }]
    });

    // Save to MongoDB Atlas
    const savedUser = await newUser.save();
    console.log("✅ Test user injected into MongoDB:", savedUser._id);

    res.status(201).json({ message: "Test user created successfully!", user: savedUser });
  } catch (error) {
    // If the user already exists (duplicate _id), just update them instead
    if (error.code === 11000) {
      const updatedUser = await User.findByIdAndUpdate("helper_001", req.body, { new: true });
      return res.status(200).json({ message: "Test user updated!", user: updatedUser });
    }
    console.error("🔥 Failed to create test user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Three separate clients are required:
//   - redisClient : general reads/writes
//   - pubClient   : Socket.IO Redis adapter publisher
//   - subClient   : Socket.IO Redis adapter subscriber
const redisOpts = {
  // Send an actual 'PING' command to ElastiCache every 30 seconds
  // AWS will never see this connection as "idle" again!
  pingInterval: 30000,

  connectTimeout: 10000,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  retryStrategy: (times) => {
    if (times > 10) {
      console.error('Redis retry limit reached. Giving up.');
      return null;
    }
    return Math.min(times * 200, 2000);
  },
};

const redisClient = new Redis(REDIS_URL, redisOpts);
const pubClient = redisClient.duplicate();
const subClient = redisClient.duplicate();

redisClient.on('error', (err) => console.error('Redis main error:', err.message));
pubClient.on('error', (err) => console.error('Redis pub error:', err.message));
subClient.on('error', (err) => console.error('Redis sub error:', err.message));

let readyCount = 0;
const onRedisReady = () => {
  readyCount++;
  if (readyCount < 3) return;

  console.log('All Redis clients connected to ElastiCache.');
  initializeSocket(server, redisClient, pubClient, subClient);

  server.listen(PORT, () => {
    console.log(`SafeGuard server running on port ${PORT}`);
  });
};

redisClient.on('ready', onRedisReady);
pubClient.on('ready', onRedisReady);
subClient.on('ready', onRedisReady);

const shutdown = async (signal) => {
  console.log(`${signal} received — shutting down gracefully...`);
  server.close(() => console.log('HTTP server closed.'));

  // Close Redis connections cleanly
  await Promise.allSettled([
    redisClient.quit(),
    pubClient.quit(),
    subClient.quit(),
  ]);
  console.log('Redis clients disconnected.');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
