const express = require('express');
const http = require('http');
const Redis = require('ioredis');
const initializeSocket = require("./sockets/socket");

const app = express();
const server = http.createServer(app);
const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisUrl = `redis://${redisHost}:6379`;

// ioredis auto-connects immediately upon creation!
const redisClient = new Redis(redisUrl);
const pubClient = redisClient.duplicate();
const subClient = redisClient.duplicate();

redisClient.on('error', (err) => console.error('❌ Redis Main Client Error:', err));
pubClient.on('error', (err) => console.error('❌ Redis Pub Client Error:', err));
subClient.on('error', (err) => console.error('❌ Redis Sub Client Error:', err));
let readyCount = 0;
const checkReady = () => {
    readyCount++;
    if (readyCount === 3) {
        console.log("All ioredis clients connected successfully to ElastiCache.");
        initializeSocket(server, redisClient, pubClient, subClient); 
    }
};

redisClient.on('ready', checkReady);
pubClient.on('ready', checkReady);
subClient.on('ready', checkReady);

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 SafeGuard Server running on port ${PORT}`);
});