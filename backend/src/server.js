require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const Redis = require('ioredis');
const mongoose = require('mongoose');
const initializeSocket = require('./sockets/socket');
const connectDB = require('./config/db')

const REQUIRED_ENV = ['MONGO_URI', 'COGNITO_USER_POOL_ID', 'COGNITO_CLIENT_ID'];
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

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

const server = http.createServer(app);
let mongoReady = false;
let serverStarted = false;
const redisReady = {
  main: false,
  pub: false,
  sub: false,
};

function allRedisClientsReady() {
  return redisReady.main && redisReady.pub && redisReady.sub;
}

function startServerIfReady() {
  if (serverStarted || !mongoReady || !allRedisClientsReady()) {
    return;
  }

  serverStarted = true;
  console.log('✅ MongoDB and all Redis clients connected.');
  initializeSocket(server, redisClient, pubClient, subClient);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SafeGuard server running on port ${PORT}`);
  });
}

app.get('/health', (req, res) => {
  const healthy = mongoReady && allRedisClientsReady();

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    mongoReady,
    redisReady: {
      ...redisReady,
      all: allRedisClientsReady(),
    },
  });
});

// Redis Setup
// Three separate clients are required:
//   - redisClient : general reads/writes
//   - pubClient   : Socket.IO Redis adapter publisher
//   - subClient   : Socket.IO Redis adapter subscriber
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
app.locals.redisClient = redisClient;

redisClient.on('error', (error) =>
  console.error('Redis main error:', error.message)
);
pubClient.on('error', (error) =>
  console.error('Redis pub error:', error.message)
);
subClient.on('error', (error) =>
  console.error('Redis sub error:', error.message)
);

redisClient.on('ready', () => {
  redisReady.main = true;
  startServerIfReady();
});
pubClient.on('ready', () => {
  redisReady.pub = true;
  startServerIfReady();
});
subClient.on('ready', () => {
  redisReady.sub = true;
  startServerIfReady();
});

async function shutdown(signal) {
  console.log(`${signal} received — shutting down gracefully...`);
  if (serverStarted) {
    server.close(() => console.log('HTTP server closed.'));
  }

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

connectDB()
  .then(() => {
    mongoReady = true;
    startServerIfReady();
  })
  .catch((error) => {
    console.error('🔥 MongoDB connection error:', error);
    process.exit(1);
  });
