const { Server } = require("socket.io");
const mongoose = require("mongoose");
const User = mongoose.model('User'); 
// const Incident = mongoose.model('Incident');
const { triggerSOS } = require("./dynamicProximitySearch"); 

// Map of RoomId -> { victimSocketId: string, currentSosTimeoutId: Timeout, rejectionCount: number }
const activeEmergencyRooms = new Map();

module.exports = function initializeSocket(server, redisClient, pubClient, subClient) {
  // Setup Socket.io Server (CORS set to open for testing/demo)
  const io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    console.log(`[CONNECTED] Mobile device connected: ${socket.id}`);

    // (I) EVENT: sos_trigger (Victim presses the button)
    socket.on("sos_trigger", async (payload) => {
      const { userId, location } = payload;
      const roomId = `incident_${userId}`;
      const redisNotifiedKey = `${roomId}:notified`;

      try {
        // CREATE THE ROOM
        socket.join(roomId);
        // We store the specific Victim Socket ID so we can privately hand it Helper updates
        activeEmergencyRooms.set(roomId, { 
            victimSocketId: socket.id,
        });
        console.log(`[ROOM CREATED] Victim ${victimUser.name} created emergency room ${roomId}`);
        startAutomatedDispatchLoop(roomId, redisNotifiedKey, location);

      } catch (error) {
        console.error("SOS Trigger Error:", error);
        socket.emit("error_msg", { message: "Server error initiating SOS. Please try 911 fallback." });
      }
    });

    // (II) EVENT: sos_alert (Helper accepts the challenge)
    socket.on("helper_accept", async (payload) => {
      const { helperId, roomId } = payload;

      try {
        const emergencyState = activeEmergencyRooms.get(roomId);
        if (!emergencyState) {
            return socket.emit("error_msg", { message: "Error: Emergency room not active or expired." });
        }

        //HELPER JOINS THE ROOM
        socket.join(roomId);
        console.log(`[HELPER JOINED] ${helperUser.name} joined room ${roomId}`);

        if (emergencyState.currentSosTimeoutId) {
            clearTimeout(emergencyState.currentSosTimeoutId);
            console.log(`[TIMER KILLED] Automated dispatch loop stopped for ${roomId}`);
        }

        const redisNotifiedKey = `${roomId}:notified`;
        await redisClient.del(redisNotifiedKey);
        console.log(`[HOT STATE CLEARED] Redis state deleted for ${roomId} to optimize RAM`);

        // helper_assigned (Tell the Victim privately)
        // We hand the Helper details to the Victim's socket privately using the stored mapping
        io.to(emergencyState.victimSocketId).emit("helper_assigned", {
          helperId: helperId,
          helperName: helperUser.name,
          message: "Someone is on the way to help you!"
        });

        // cancel_alert (Tell other helpers in the pool)
        // Emit a broadcast event to the whole room telling the other 4 people in the batch
        // that the request is already handled, so their apps remove the pop-up
        socket.to(roomId).emit("cancel_alert", {
            roomId: roomId,
            message: "Another helper has already accepted this SOS. Thank you!"
        });

      } catch (error) {
        console.error("Helper Accept Error:", error);
      }
    });

    // (III) EVENT: helper_reject (The Fast-Forward Button)
    socket.on("helper_reject", async (payload) => {
        const { helperId, roomId } = payload;
        
        console.log(`[HELPER REJECTED] ${helperId} said 'No' to ${roomId}. Processing fast-forward...`);

        try {
            const emergencyState = activeEmergencyRooms.get(roomId);
            if (!emergencyState) return;

            if (!emergencyState.rejectionCount) {
                emergencyState.rejectionCount = 0;
            }
            emergencyState.rejectionCount++;
            
            console.log(`[REJECTION COUNTER] Room ${roomId} is now at ${emergencyState.rejectionCount}/5 explicit rejections.`);

            if (emergencyState.rejectionCount >= 5) {
                console.log(`[FAST-FORWARD] 5/5 rejections reached for ${roomId}. Instantly triggering next batch search.`);

                // A. Kill the existing 30s clock
                if (emergencyState.currentSosTimeoutId) {
                    clearTimeout(emergencyState.currentSosTimeoutId); //
                    console.log(`[TIMER OVERRIDDEN] 30s timeout cleared early.`);
                }

                // B. Reset the counter for the *next* batch (so it doesn't just instantly re-trigger)
                emergencyState.rejectionCount = 0;

                // C. Manually execute the recursive dispatch loop immediately
                // We need to pass the location, which we would need to store in the Map during sos_trigger.
                // Assuming `emergencyState.originalVictimLocation` was stored during 'sos_trigger' for this demo.
                const redisNotifiedKey = `${roomId}:notified`;
                const location = emergencyState.originalVictimLocation; // Needs to be added to Map in sos_trigger
 
                startAutomatedDispatchLoop(roomId, redisNotifiedKey, location); 
            }

        } catch (error) {
            console.error("Helper Reject Error:", error);
        }
    });

    // (IV) PRIVACY-ROUTING
    // PATH 1: VICTIM MOVES -> Megaphone to everyone
    socket.on("victim_location_update", (payload) => {
      const { roomId, location } = payload;
      socket.to(roomId).emit("update_victim_pin", location); 
    });

    socket.on("helper_location_update", (payload) => {
      const { roomId, helperId, location } = payload;
      const emergencyState = activeEmergencyRooms.get(roomId);
      if (emergencyState && emergencyState.victimSocketId) {
        io.to(emergencyState.victimSocketId).emit("update_helper_pin", {
          helperId: helperId,
          location: location
        });
      }
    });

// CLEANUP: Device disconnects
    socket.on("disconnect", async () => { // <-- Note the 'async' here!
      console.log(`[DISCONNECTED] Device lost connection: ${socket.id}`);

      // Loop through all active rooms to find if the disconnected socket was a Victim
      for (const [roomId, emergencyState] of activeEmergencyRooms.entries()) {
        
        if (emergencyState.victimSocketId === socket.id) {
          console.log(`[CLEANUP] Victim disconnected. Tearing down emergency state for ${roomId}`);

          if (emergencyState.currentSosTimeoutId) {
            clearTimeout(emergencyState.currentSosTimeoutId);
            console.log(`[TIMER KILLED] Stopped automated dispatch loop for ${roomId}.`);
          }

          try {
            const redisNotifiedKey = `${roomId}:notified`;
            await redisClient.del(redisNotifiedKey);
            console.log(`[REDIS CLEANUP] Cleared Hot State memory for ${roomId}.`);
          } catch (err) {
            console.error(`[REDIS ERROR] Failed to clean up memory for ${roomId}:`, err);
          }

          // BROADCAST CANCELLATION: Tell any helpers in the room to stand down
          // Using `socket.to().emit()` sends to everyone else in the room
          socket.to(roomId).emit("cancel_alert", {
            roomId: roomId,
            message: "The SOS request was cancelled because the victim lost connection."
          });

          // PREVENT MEMORY LEAKS: Delete the room from the Node.js Map
          activeEmergencyRooms.delete(roomId);
          
          // A single socket ID can only be the victim of one room, so we stop searching
          break; 
        }
      }
    });
  });

  // This logic is called by 'sos_trigger' and recursively by itself every 30s
  async function startAutomatedDispatchLoop(roomId, redisKey, originalVictimLocation) {
    const emergencyState = activeEmergencyRooms.get(roomId);
    if (!emergencyState) return; // Exit if the emergency is resolved or cancelled

    try {
        // 1. --- HOT STATE READ (Redis SMEMBERS) ---
        // Find everyone who rejected or timed out previously to generate the rejectIds parameter
        const rejectIdsPoolArray = await redisClient.sMembers(redisKey);
        
        // 2. --- TEAMMATE INTEGRATION (The Specialized Calculator) ---
        // Pass the victim's location and the pool of people to ignore into triggerSOS
        const nearbyHelperBatch = await triggerSOS(originalVictimLocation.lat, originalVictimLocation.lng, rejectIdsPoolArray);

        // --- EMPTY POOL FALLBACK (The 911 Escalation) ---
        if (nearbyHelperBatch.length === 0) {
            // Teammate's math function (H3 expansion up to 18 rings) returned empty. 
            // We MUST escalate. The server cannot do nothing.
            console.log(`[EMPTY POOL] All available H3 rings exhausted for ${roomId}. Escalating to 911.`);

            // Emit the specific escalation event back to the Victim's socket privately
            io.to(emergencyState.victimSocketId).emit("escalate_to_911", {
                roomId: roomId,
                message: "A helper could not be found near your location. Please dial 911 immediately using the button on your screen."
            });

            // We do not set another timer; the loop ends here.
            return;
        }

        // --- PASSIVE LOGGING IN MONGO ATLAS (The Gap Analysis) ---
        // Analyze who failed to respond (the people H3 returned *before* teammate filtered out the rejectIds set).
        // Concept only: We would log these failed IDs into the Incident timeline asynchronously here.

        // 3. --- PING THE WINNERS ---
        // Limit to 5 (or let teammate do batching). Assuming dynamic.js returns top 5 already.
        const helpersToNotify = nearbyHelperBatch.slice(0, 5); 

        helpersToNotify.forEach(helper => {
           // Emitting the alert to the general socket namespace (Helpers apps are listening for `sos_alert_${myUserId}`)
           // If a helper is offline, FCM Push Notifications should trigger here too
           io.emit(`sos_alert_${helper.userId}`, {
             roomId: roomId,
             victimLocation: originalVictimLocation,
             message: "Emergency nearby! Can you assist?"
           });
        });

        // 4. --- HOT STATE WRITE (Redis SADD) ---
        // Persistently save the 5 people we just pinged into the Redis 'notified' set so we do not annoy them in 30 seconds
        const helperIdsJustNotifiedArray = helpersToNotify.map(h => h.userId);
        await redisClient.sAdd(redisKey, helperIdsJustNotifiedArray); 
        console.log(`[REDIS HOT STATE WRITE] Pushed ${helperIdsJustNotifiedArray.length} IDs to notified list for ${roomId}`);

        // --- RECURSIVE TIMER START (The 30-Second Countdown) ---
        // Save the Timeout ID in our state memory so we can kill it with `clearTimeout` later!
        emergencyState.currentSosTimeoutId = setTimeout(() => {
            console.log(`[TIMER EXPIRED] 30s timeout elapsed for ${roomId}. Starting next batch search phase...`);
            // Recursive Callback: Start the loop again to find the NEXT batch of 5 nearest helpers
            startAutomatedDispatchLoop(roomId, redisKey, originalVictimLocation);
        }, 30000); // 30,000 milliseconds = 30 seconds

    } catch (error) {
        console.error("Automated Dispatch Loop Error:", error);
    }
  }
};