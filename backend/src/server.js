require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const Redis = require('ioredis');
const mongoose = require('mongoose');
const initializeSocket = require('./sockets/socket');
const User = require('./models/User');

const REQUIRED_ENV = ['MONGO_URI'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const PORT = Number(process.env.PORT || 3000);
const REDIS_URL =
  process.env.REDIS_URL ||
  `redis://${process.env.REDIS_HOST || '127.0.0.1'}:6379`;

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((error) => {
    console.error('🔥 MongoDB connection error:', error);
    process.exit(1);
  });

app.get('/health', async (req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;

  res.status(mongoReady ? 200 : 503).json({
    status: mongoReady ? 'ok' : 'degraded',
    mongoReady,
  });
});

app.get('/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error('[API] Failed to fetch user:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.put('/users/:userId/device', async (req, res) => {
  const userId = String(req.params.userId || '').trim();
  const {
    name,
    role,
    fcmToken,
    isHelperAvailable,
    emergencyContacts,
  } = req.body || {};

  if (!userId) {
    return res.status(400).json({ error: 'userId is required.' });
  }

  try {
    const update = {
      ...(typeof name === 'string' && name.trim()
        ? { name: name.trim() }
        : {}),
      ...(typeof role === 'string' ? { role } : {}),
      ...(typeof fcmToken === 'string' || fcmToken === null
        ? { fcmToken }
        : {}),
      ...(typeof isHelperAvailable === 'boolean'
        ? { isHelperAvailable }
        : {}),
      ...(Array.isArray(emergencyContacts) ? { emergencyContacts } : {}),
    };

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: update, $setOnInsert: { _id: userId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.status(200).json(user);
  } catch (error) {
    console.error('[API] Failed to upsert device/user profile:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.put('/users/:userId/status', async (req, res) => {
  const userId = String(req.params.userId || '').trim();
  const { isHelperAvailable, lastKnownLocation } = req.body || {};

  if (!userId) {
    return res.status(400).json({ error: 'userId is required.' });
  }

  try {
    const update = {};

    if (typeof isHelperAvailable === 'boolean') {
      update.isHelperAvailable = isHelperAvailable;
    }

    if (
      lastKnownLocation &&
      Number.isFinite(Number(lastKnownLocation.lat)) &&
      Number.isFinite(Number(lastKnownLocation.lng))
    ) {
      update.lastKnownLocation = {
        lat: Number(lastKnownLocation.lat),
        lng: Number(lastKnownLocation.lng),
        updatedAt: new Date(),
      };
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: update, $setOnInsert: { _id: userId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.status(200).json(user);
  } catch (error) {
    console.error('[API] Failed to update user status:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

const redisOpts = {
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

redisClient.on('error', (error) =>
  console.error('Redis main error:', error.message)
);
pubClient.on('error', (error) =>
  console.error('Redis pub error:', error.message)
);
subClient.on('error', (error) =>
  console.error('Redis sub error:', error.message)
);

let readyCount = 0;

const onRedisReady = () => {
  readyCount += 1;

  if (readyCount < 3) {
    return;
  }

  console.log('✅ All Redis clients connected.');
  initializeSocket(server, redisClient, pubClient, subClient);

  server.listen(PORT, () => {
    console.log(`SafeGuard server running on port ${PORT}`);
  });
};

redisClient.on('ready', onRedisReady);
pubClient.on('ready', onRedisReady);
subClient.on('ready', onRedisReady);

async function shutdown(signal) {
  console.log(`${signal} received — shutting down gracefully...`);
  server.close(() => console.log('HTTP server closed.'));

  await Promise.allSettled([
    redisClient.quit(),
    pubClient.quit(),
    subClient.quit(),
    mongoose.connection.close(),
  ]);

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
