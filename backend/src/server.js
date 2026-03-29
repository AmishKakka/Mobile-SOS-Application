const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const { triggerSOS } = require('./sos/dynamic');

const app = express();
app.use(cors()); // Enable CORS for all routes (for the PoC, allow connections from anywhere)
app.use(express.json());

const server = http.createServer(app);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.post('/api/sos/trigger', async (req, res) => {
    const { victimLat, victimLng, rejectIds = [] } = req.body || {};

    if (!Number.isFinite(victimLat) || !Number.isFinite(victimLng)) {
        return res.status(400).json({
            error: 'victimLat and victimLng must be valid numbers.',
        });
    }
    if (!Array.isArray(rejectIds)) {
        return res.status(400).json({
            error: 'rejectIds must be an array.',
        });
    }

    try {
        const result = await triggerSOS(victimLat, victimLng, rejectIds);
        return res.status(200).json({ result });
    } catch (error) {
        console.error('Failed to trigger SOS:', error.message);
        return res.status(500).json({
            error: 'Unable to process SOS request.',
        });
    }
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

    // ACTION 3: Victim triggers SOS helper search (dynamic radius logic in Redis/H3)
    socket.on('trigger_sos', async (data = {}) => {
        const { victimLat, victimLng, rejectIds = [] } = data;

        if (!Number.isFinite(victimLat) || !Number.isFinite(victimLng)) {
            socket.emit('sos_result', {
                ok: false,
                error: 'victimLat and victimLng must be valid numbers.',
            });
            return;
        }
        if (!Array.isArray(rejectIds)) {
            socket.emit('sos_result', {
                ok: false,
                error: 'rejectIds must be an array.',
            });
            return;
        }

        try {
            const result = await triggerSOS(victimLat, victimLng, rejectIds);
            socket.emit('sos_result', {
                ok: true,
                result,
            });
        } catch (error) {
            console.error('Socket trigger_sos failed:', error.message);
            socket.emit('sos_result', {
                ok: false,
                error: 'Unable to process SOS request.',
            });
        }
    });

    // ACTION 4: Cleanup when someone closes the app
    socket.on('disconnect', () => {
        console.log(`User ${socket.id} disconnected.`);
        // Note: Socket.io automatically removes them from the room when they disconnect,
        // so you don't need to write manual room cleanup code here!
    });
});

server.listen(3000, () => {
    console.log('SOS Tracking PoC Server is running on port 3000');
});
