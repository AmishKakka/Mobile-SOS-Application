const admin = require('firebase-admin');
const User = require('../models/User');

function isMessagingReady() {
  return admin.apps && admin.apps.length > 0;
}

async function clearUserToken(userId, token) {
  if (!userId || !token) {
    return;
  }

  try {
    await User.updateOne(
      { _id: userId, fcmToken: token },
      { $set: { fcmToken: null } },
    );
  } catch (error) {
    console.error('[FCM] Failed to clear invalid helper token:', error.message);
  }
}

async function alertHelpersViaFCM(helpersToNotify, incident) {
  if (!Array.isArray(helpersToNotify) || helpersToNotify.length === 0) {
    return;
  }

  if (!isMessagingReady()) {
    console.warn('[FCM] Firebase admin is not initialized. Skipping helper push.');
    return;
  }

  try {
    const helperIds = helpersToNotify.map((helper) => helper.userId);
    const users = await User.find({ _id: { $in: helperIds } })
      .select('_id fcmToken name')
      .lean();

    const tokenRows = users
      .filter((user) => user.fcmToken)
      .map((user) => ({ userId: String(user._id), token: user.fcmToken }));

    if (tokenRows.length === 0) {
      console.log('[FCM] No valid helper device tokens found.');
      return;
    }

    const message = {
      tokens: tokenRows.map((row) => row.token),
      notification: {
        title: 'Emergency nearby',
        body: 'A nearby user has triggered SOS. Open the app to respond.',
      },
      data: {
        type: 'SOS_DISPATCH',
        roomId: String(incident.roomId),
        victimUserId: String(incident.victimUserId),
        victimName: String(incident.victimName || incident.victimUserId),
        victimLat: String(incident.victimLocation.lat),
        victimLng: String(incident.victimLocation.lng),
        incidentType: String(incident.incidentType || 'Emergency'),
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'emergency_channel',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(
      `[FCM] Helper blast sent to ${tokenRows.length} devices. Success=${response.successCount} Failure=${response.failureCount}`,
    );

    if (response.failureCount > 0) {
      const cleanups = [];
      response.responses.forEach((result, index) => {
        const row = tokenRows[index];
        if (!result.success && result.error) {
          const code = result.error.code || '';
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            cleanups.push(clearUserToken(row.userId, row.token));
          }
        }
      });
      await Promise.allSettled(cleanups);
    }
  } catch (error) {
    console.error('[FCM] Failed to alert helpers:', error);
  }
}

async function alertEmergencyContacts(victimId, victimLocation, roomId) {
  try {
    const victim = await User.findById(victimId).lean();

    if (!victim || !Array.isArray(victim.emergencyContacts) || victim.emergencyContacts.length === 0) {
      console.log(`[ALERT] No emergency contacts configured for victim ${victimId}`);
      return;
    }

    const googleMapsLink = `https://www.google.com/maps?q=${victimLocation.lat},${victimLocation.lng}`;

    for (const contact of victim.emergencyContacts) {
      if (contact.fcmToken && isMessagingReady()) {
        const message = {
          token: contact.fcmToken,
          notification: {
            title: `${victim.name || 'A SafeGuard user'} triggered SOS`,
            body: 'Open the app to view their latest location.',
          },
          data: {
            type: 'EMERGENCY_CONTACT_SOS',
            roomId: String(roomId),
            victimId: String(victimId),
            victimLat: String(victimLocation.lat),
            victimLng: String(victimLocation.lng),
          },
        };

        await admin.messaging().send(message);
        continue;
      }

      if (contact.phoneNumber) {
        console.log(
          `[SMS MOCK] Send SMS to ${contact.phoneNumber}: ${victim.name || victimId} needs help. ${googleMapsLink}`,
        );
      }
    }
  } catch (error) {
    console.error('[ALERT] Failed to notify emergency contacts:', error);
  }
}

async function forceWakeDevice(userId) {
  if (!isMessagingReady()) {
    console.warn('[FCM] Firebase admin is not initialized. Skipping wake push.');
    return;
  }

  try {
    const user = await User.findById(userId).select('fcmToken').lean();

    if (!user || !user.fcmToken) {
      console.log(`[WAKE] No FCM token found for ${userId}`);
      return;
    }

    const response = await admin.messaging().send({
      token: user.fcmToken,
      data: {
        command: 'WAKE_AND_PING_LOCATION',
        urgency: 'CRITICAL',
      },
      android: { priority: 'high' },
      apns: {
        headers: {
          'apns-priority': '5',
          'apns-push-type': 'background',
        },
        payload: {
          aps: {
            'content-available': 1,
          },
        },
      },
    });

    console.log(`[WAKE] Silent wake sent to ${userId}. Response=${response}`);
  } catch (error) {
    console.error('[WAKE] Failed to send silent wake push:', error);
  }
}

module.exports = {
  alertHelpersViaFCM,
  alertEmergencyContacts,
  forceWakeDevice,
};
