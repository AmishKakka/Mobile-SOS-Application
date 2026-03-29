const express = require('express');
const http = require('http');
const { createClient } = require("redis");
const initializeSocket = require("./socket");

const app = express();
const server = http.createServer(app);
const redisUrl = process.env.REDIS_URL;

const redisClient = createClient({ url: redisUrl });
const pubClient = redisClient.duplicate();
const subClient = redisClient.duplicate();

Promise.all([
  redisClient.connect(),
  pubClient.connect(),
  subClient.connect()
]).then(() => {
  console.log("All Redis clients connected successfully.");
  initializeSocket(server, redisClient, pubClient, subClient); 
});