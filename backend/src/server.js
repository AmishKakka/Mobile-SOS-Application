const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors()); // Enable CORS for all routes (for the PoC, allow connections from anywhere)

const server = http.createServer(app);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

//Attach Socket.io to that HTTP server
const io = new Server(server, {
    cors: {
        origin: "*", // For the PoC, allow connections from anywhere
        methods: ["GET", "POST"]
    }
});

// Listen for new phone connections
io.on('connection', (socket) => {
    console.log(`A user connected with ID: ${socket.id}`);

    // ACTION 1: Join the Incident Room
    // Both the Victim and the Helper must emit this event from their phones
    socket.on('join_incident', (data) => {
        const { incidentId, role } = data; // role = 'victim' or 'helper'

        // Create the unique room name (e.g., "incident_999")
        const roomName = `incident_${incidentId}`;

        // Add this specific phone to that room
        socket.join(roomName);
        console.log(`User ${socket.id} joined ${roomName} as ${role}`);
    });

    // ACTION 2: The Helper sends their live GPS coordinates
    socket.on('helper_location_update', (data) => {
        const { incidentId, lat, lng } = data;
        const roomName = `incident_${incidentId}`;

        // THE ROUTER LOGIC:
        // socket.to(roomName).emit(...) sends the data to EVERYONE in that 
        // room EXCEPT the person who just sent it.
        // So the Helper sends it, and ONLY the Victim receives it.
        socket.to(roomName).emit('victim_map_update', {
            lat: lat,
            lng: lng,
            timestamp: Date.now()
        });
    });

    // ACTION 3: Cleanup when someone closes the app
    socket.on('disconnect', () => {
        console.log(`User ${socket.id} disconnected.`);
        // Note: Socket.io automatically removes them from the room when they disconnect,
        // so you don't need to write manual room cleanup code here!
    });
});

server.listen(3000, () => {
    console.log('SOS Tracking PoC Server is running on port 3000');
});
