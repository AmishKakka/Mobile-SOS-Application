const admin = require('firebase-admin');
const User = require('../models/User'); // Import your MongoDB Mongoose model

// ─── 1. FEATURE A: ALERT 5 NEAREST HELPERS (Production) ────────────────────
async function alertHelpersViaFCM(helpersToNotify, victimLocation) {
    try {
        // 1. Extract the user IDs from the proximity search results
        const helperIds = helpersToNotify.map(h => h.userId);

        // 2. Query MongoDB Atlas for their actual physical device tokens
        const users = await User.find({ _id: { $in: helperIds } }).select('fcmToken');

        // Filter out any users who might have logged out and deleted their token
        const tokens = users.map(u => u.fcmToken).filter(token => token);

        if (tokens.length === 0) {
            console.log('[FCM] No valid device tokens found for nearby helpers.');
            return;
        }

        // 3. Build the Multicast Payload
        const message = {
            tokens: tokens,
            notification: {
                title: "🚨 URGENT: SOS Nearby!",
                body: "Someone nearby needs your help immediately. Tap to open map.",
            },
            data: {
                type: "SOS_DISPATCH",
                lat: String(victimLocation.lat),
                lng: String(victimLocation.lng)
            },
            android: {
                priority: "high",
                notification: { sound: "default", channelId: "emergency_channel" }
            },
            apns: {
                payload: { aps: { sound: "default", badge: 1 } }
            }
        };

        // 4. Send to all real devices simultaneously
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`[FCM] Blast sent to ${tokens.length} helpers. Success: ${response.successCount}`);

    } catch (error) {
        console.error("[FCM ERROR] Failed to alert helpers:", error);
    }
}

// ─── 2. EMERGENCY CONTACTS ALERT (Production) ──────────────────────────────
async function alertEmergencyContacts(victimId, victimLocation) {
    try {
        // 1. Query MongoDB for the victim and populate their emergency contacts
        const victim = await User.findById(victimId).populate('emergencyContacts');

        if (!victim || !victim.emergencyContacts || victim.emergencyContacts.length === 0) {
            console.log(`[ALERT] No emergency contacts found for victim ${victimId}`);
            return;
        }

        const googleMapsLink = `http://googleusercontent.com/maps.google.com/?q=${victimLocation.lat},${victimLocation.lng}`;

        // 2. Loop through contacts and send the appropriate alert
        for (const contact of victim.emergencyContacts) {

            // IF THEY HAVE THE APP (Send FCM)
            if (contact.fcmToken) {
                const message = {
                    token: contact.fcmToken,
                    notification: {
                        title: `🚨 ${victim.name} Triggered an SOS!`,
                        body: "Tap to view their live location.",
                    },
                    data: { type: "EMERGENCY_CONTACT_SOS" }
                };
                await admin.messaging().send(message);
            }
            // IF THEY DO NOT HAVE THE APP (Send SMS via AWS SNS or Twilio)
            else if (contact.phoneNumber) {
                console.log(`[SMS MOCK] Sending SMS to ${contact.phoneNumber}: ${victim.name} needs help! ${googleMapsLink}`);
                // Insert your AWS SNS / Twilio code here to send the text message!
            }
        }
    } catch (error) {
        console.error("[ALERT ERROR] Failed to notify emergency contacts:", error);
    }
}

// ─── 3. FEATURE B: WAKE-ON-PUSH (Production) ────────────────────────────────
async function forceWakeDevice(userId) {
    try {
        // 1. Fetch the dead user's token from MongoDB
        const user = await User.findById(userId).select('fcmToken');

        if (!user || !user.fcmToken) {
            console.log(`[WAKE] Cannot wake ${userId} - no FCM token found.`);
            return;
        }

        // 2. Build the SILENT Data-Only Payload
        const message = {
            token: user.fcmToken,
            data: {
                command: "WAKE_AND_PING_LOCATION",
                urgency: "CRITICAL"
            },
            android: { priority: "high" },
            apns: {
                headers: { "apns-priority": "5", "apns-push-type": "background" },
                payload: { aps: { "content-available": 1 } }
            }
        };

        const response = await admin.messaging().send(message);
        console.log(`[WAKE-ON-PUSH] Silent wake sent to ${userId}. ID: ${response}`);

    } catch (error) {
        console.error(`[WAKE-ON-PUSH ERROR]:`, error);
    }
}

module.exports = { alertHelpersViaFCM, alertEmergencyContacts, forceWakeDevice };