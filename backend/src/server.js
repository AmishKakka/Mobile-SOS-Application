require('dotenv').config({ path: '../.env' }); 

const express = require('express');
const http    = require('http');
const cors    = require('cors');
const Redis   = require('ioredis');
const initializeSocket = require('./sockets/socket');
const connectDB = require('./config/db'); // 2. Import your DB config

const REQUIRED_ENV = ['REDIS_HOST', 'MONGO_URI'];
// const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
// if (missing.length > 0) {
//   console.error(`Missing required environment variables: ${missing.join(', ')}`);
//   process.exit(1);
// }                  

const PORT = process.env.PORT || 3000;
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_URL  = `redis://${REDIS_HOST}:6379`;

const app = express();

console.log(process.env.MONGO_URI); // Add this line in your src/server.js to verify it's being loaded correctly. If it prints undefined, double-check your .env file and ensure it's in the correct location (the root of your backend directory) and that you have restarted your server after creating or modifying the .env file.

connectDB(); 

app.use(cors());
app.use(express.json());

const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

const server = http.createServer(app);

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Redis Setup
// Three separate clients are required:
//   - redisClient : general reads/writes
//   - pubClient   : Socket.IO Redis adapter publisher
//   - subClient   : Socket.IO Redis adapter subscriber
const redisOpts = {
  retryStrategy: (times) => {
    if (times > 10) {
      console.error('Redis retry limit reached. Giving up.');
      return null;
    }
    return Math.min(times * 200, 2000); 
  },
};

const redisClient = new Redis(REDIS_URL, redisOpts);
const pubClient   = redisClient.duplicate();
const subClient   = redisClient.duplicate();

redisClient.on('error', (err) => console.error('Redis main error:', err.message));
pubClient.on('error',   (err) => console.error('Redis pub error:',  err.message));
subClient.on('error',   (err) => console.error('Redis sub error:',  err.message));

let readyCount = 0;
const onRedisReady = () => {
  readyCount++;
  if (readyCount < 3) return;

  console.log('All Redis clients connected to ElastiCache.');
  initializeSocket(server, redisClient, pubClient, subClient);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SafeGuard server running on port ${PORT}`);
  });
};

redisClient.on('ready', onRedisReady);
pubClient.on('ready',   onRedisReady);
subClient.on('ready',   onRedisReady);

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
process.on('SIGINT',  () => shutdown('SIGINT'));