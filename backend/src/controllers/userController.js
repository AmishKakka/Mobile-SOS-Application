const User = require('../models/User.js');
const bcrypt = require('bcryptjs');
const { syncHelperAvailabilityIndex } = require('../services/helperAvailabilityIndex');
const { IncidentEvent } = require('../services/incidentTelemetryStore');

async function syncRedisHelperState(req, user) {
    const redisClient = req.app?.locals?.redisClient;
    if (!redisClient || !user) {
        return;
    }

    try {
        await syncHelperAvailabilityIndex(redisClient, user);
    } catch (error) {
        console.error("Redis Helper Sync Error:", error.message);
    }
}

function hasValidProfilePhone(phone) {
    return typeof phone === 'string' && phone.replace(/\D/g, '').length === 10;
}

function hasEmergencyContact(contacts) {
    return Array.isArray(contacts) && contacts.length > 0;
}

function buildProfileSetupPatch(updateData, existingUser) {
    const patch = {};
    const existingSetup = existingUser?.profileSetup || {};

    const nextSetup = {
        personalDetailsCompleted: Boolean(existingSetup.personalDetailsCompleted),
        emergencyContactsCompleted: Boolean(existingSetup.emergencyContactsCompleted),
        medicalProfileCompleted: Boolean(existingSetup.medicalProfileCompleted),
        pinSetupCompleted: Boolean(existingSetup.pinSetupCompleted),
    };

    if (Object.prototype.hasOwnProperty.call(updateData, 'phone')) {
        nextSetup.personalDetailsCompleted = hasValidProfilePhone(updateData.phone);
    }

    if (Object.prototype.hasOwnProperty.call(updateData, 'emergencyContacts')) {
        nextSetup.emergencyContactsCompleted = hasEmergencyContact(updateData.emergencyContacts);
    }

    if (Object.prototype.hasOwnProperty.call(updateData, 'medical')) {
        nextSetup.medicalProfileCompleted = true;
    }

    patch['profileSetup.personalDetailsCompleted'] = nextSetup.personalDetailsCompleted;
    patch['profileSetup.emergencyContactsCompleted'] = nextSetup.emergencyContactsCompleted;
    patch['profileSetup.medicalProfileCompleted'] = nextSetup.medicalProfileCompleted;
    patch['profileSetup.pinSetupCompleted'] = nextSetup.pinSetupCompleted;

    if (
        nextSetup.personalDetailsCompleted
        && nextSetup.emergencyContactsCompleted
        && nextSetup.medicalProfileCompleted
        && nextSetup.pinSetupCompleted
    ) {
        patch['profileSetup.completedAt'] = existingSetup.completedAt || new Date();
    } else {
        patch['profileSetup.completedAt'] = null;
    }

    return patch;
}

function removeConflictingSetOnInsertFields(setFields, setOnInsertFields) {
    const sanitizedSetOnInsert = { ...setOnInsertFields };

    Object.keys(setFields).forEach((fieldName) => {
        delete sanitizedSetOnInsert[fieldName];
    });

    return sanitizedSetOnInsert;
}

function serializeHistoryLocation(location) {
    if (
        location
        && Number.isFinite(Number(location.lat))
        && Number.isFinite(Number(location.lng))
    ) {
        return {
            lat: Number(location.lat),
            lng: Number(location.lng),
        };
    }

    return null;
}

function getIncidentCreatedEvent(events) {
    return events.find((event) => event.eventType === 'INCIDENT_CREATED') || null;
}

function getIncidentClosedEvent(events) {
    return [...events]
        .reverse()
        .find((event) => ['INCIDENT_COMPLETED', 'INCIDENT_CANCELLED'].includes(event.eventType)) || null;
}

function countAcceptedHelpers(events) {
    return new Set(
        events
            .filter((event) => event.eventType === 'HELPER_ACCEPTED' && event.helperId)
            .map((event) => String(event.helperId))
    ).size;
}

function countAssignedHelpers(events) {
    return new Set(
        events
            .filter((event) => event.eventType === 'HELPER_ASSIGNED' && event.helperId)
            .map((event) => String(event.helperId))
    ).size;
}

function countIncidentHelpers(events) {
    const acceptedHelpers = countAcceptedHelpers(events);
    return acceptedHelpers > 0 ? acceptedHelpers : countAssignedHelpers(events);
}

function getInitialHelperDistance(events, helperId) {
    const assignedEvent = events.find((event) =>
        event.eventType === 'HELPER_ASSIGNED'
        && String(event.helperId || '') === String(helperId || '')
        && Number.isFinite(Number(event.details?.helperDistanceMeters))
    );

    return assignedEvent ? Number(assignedEvent.details.helperDistanceMeters) : null;
}

function getFirstHelperEvent(events, helperId, eventType, predicate = () => true) {
    return events.find((event) =>
        event.eventType === eventType
        && String(event.helperId || '') === String(helperId || '')
        && predicate(event)
    ) || null;
}

function getLastHelperEvent(events, helperId, eventType, predicate = () => true) {
    return [...events]
        .reverse()
        .find((event) =>
            event.eventType === eventType
            && String(event.helperId || '') === String(helperId || '')
            && predicate(event)
        ) || null;
}

function secondsBetween(startValue, endValue) {
    const startMs = new Date(startValue).getTime();
    const endMs = new Date(endValue).getTime();

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
        return null;
    }

    return Math.round((endMs - startMs) / 1000);
}

async function getNamesById(userIds) {
    const safeIds = [...new Set(userIds.map((id) => String(id || '').trim()).filter(Boolean))];
    if (!safeIds.length) {
        return {};
    }

    const users = await User.find({ _id: { $in: safeIds } })
        .select('_id name firstName lastName email')
        .lean();

    return users.reduce((acc, user) => {
        const userId = String(user._id);
        acc[userId] =
            String(user.name || '').trim()
            || [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
            || String(user.email || userId);
        return acc;
    }, {});
}

function buildVictimHistoryItem({ createdEvent, events }) {
    const closedEvent = getIncidentClosedEvent(events);
    const helpersCount = countIncidentHelpers(events);
    const status = !closedEvent
        ? 'active'
        : closedEvent.eventType === 'INCIDENT_COMPLETED'
            ? 'resolved'
            : 'cancelled';

    return {
        id: `${createdEvent.incidentId}:victim`,
        incidentId: createdEvent.incidentId,
        role: 'victim',
        status,
        title: 'SOS request',
        sosPressedAt: createdEvent.ts,
        sosPressedLocation: serializeHistoryLocation(createdEvent.location),
        helpersCount,
        resolvedAt: closedEvent?.ts || null,
        resolvedLocation: serializeHistoryLocation(closedEvent?.location),
        completionDurationSeconds: closedEvent
            ? secondsBetween(createdEvent.ts, closedEvent.ts)
            : null,
    };
}

function buildHelperRoleHistoryItem({
    helperId,
    events,
    createdEvent,
    victimName,
}) {
    const assignedEvent = getFirstHelperEvent(events, helperId, 'HELPER_ASSIGNED');
    const acceptedEvent = getFirstHelperEvent(events, helperId, 'HELPER_ACCEPTED');
    const arrivedEvent = getFirstHelperEvent(events, helperId, 'ARRIVED');
    const cannotHandleEvent = getLastHelperEvent(
        events,
        helperId,
        'HELPER_CANCELLED',
        (event) => event.details?.reason === 'cannot_handle'
    );
    const completedByHelperEvent = getLastHelperEvent(
        events,
        helperId,
        'INCIDENT_COMPLETED',
        (event) => event.details?.reason === 'helped'
    );
    const closedEvent = getIncidentClosedEvent(events);
    const occurredAt =
        assignedEvent?.ts
        || acceptedEvent?.ts
        || cannotHandleEvent?.ts
        || completedByHelperEvent?.ts
        || closedEvent?.ts
        || createdEvent?.ts
        || new Date();
    let status = 'active';

    if (cannotHandleEvent) {
        status = 'could_not_handle';
    } else if (completedByHelperEvent) {
        status = 'helped';
    } else if (closedEvent?.eventType === 'INCIDENT_COMPLETED') {
        status = 'resolved';
    } else if (closedEvent?.eventType === 'INCIDENT_CANCELLED') {
        status = 'cancelled';
    }

    const resolvedAt = closedEvent?.ts || null;
    const resolvedLocation = serializeHistoryLocation(closedEvent?.location);
    const title = cannotHandleEvent
        ? `Could not handle ${victimName}`
        : status === 'active'
            ? `Responding to ${victimName}`
            : status === 'cancelled'
                ? `Response ended for ${victimName}`
                : `Helped ${victimName}`;

    return {
        id: `${createdEvent?.incidentId || assignedEvent?.incidentId}:helper:${helperId}`,
        incidentId: createdEvent?.incidentId || assignedEvent?.incidentId,
        role: 'helper',
        status,
        title,
        victimName,
        requestReceivedAt: assignedEvent?.ts || null,
        acceptedAt: acceptedEvent?.ts || null,
        arrivedAt: arrivedEvent?.ts || null,
        arrivalDurationSeconds: acceptedEvent && arrivedEvent
            ? secondsBetween(acceptedEvent.ts, arrivedEvent.ts)
            : null,
        resolvedAt,
        resolvedLocation,
        couldNotHandleAt: cannotHandleEvent?.ts || null,
        initialDistanceMeters: getInitialHelperDistance(events, helperId),
        occurredAt,
    };
}

// CREATE: Sync a new AWS Cognito user into the MongoDB database
exports.registerUser = async (req, res) => {
    try {
        // The frontend will pass this data right after AWS confirms the email
        const { firstName, lastName, email, cognitoId } = req.body;

        if (!cognitoId) {
            return res.status(400).json({ message: "Missing AWS Cognito ID." });
        }

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "User database profile already exists." });
        }

        // Create the new user object and save to database
        user = new User({
            cognitoId,
            firstName,
            lastName,
            email,
            name: [firstName, lastName].filter(Boolean).join(' ').trim(),
            role: "victim", 
            status: { isActive: true, isVerified: true },
            profileSetup: {
                personalDetailsCompleted: false,
                emergencyContactsCompleted: false,
                medicalProfileCompleted: false,
                pinSetupCompleted: false,
                completedAt: null
            }
        });

        await user.save();

        res.status(201).json({ 
            message: "User profile synced to MongoDB successfully", 
            userId: user._id 
        });
    } catch (error) {
        console.error("Database Registration Error:", error.message);
        res.status(500).json({ error: "Server error during MongoDB sync" });
    }
};

exports.syncAuthenticatedUser = async (req, res) => {
    try {
        const cognitoId = req.user?.cognitoId;
        const email = req.user?.email;
        const firstName = req.user?.firstName || req.body?.firstName || '';
        const lastName = req.user?.lastName || req.body?.lastName || '';

        if (!cognitoId || !email || !firstName || !lastName) {
            return res.status(400).json({ message: "Authenticated user details are incomplete." });
        }

        const update = {
            cognitoId,
            email,
            firstName,
            lastName,
            name: [firstName, lastName].filter(Boolean).join(' ').trim(),
        };

        const user = await User.findOneAndUpdate(
            { $or: [{ cognitoId }, { email }] },
            {
                $set: update,
                $setOnInsert: {
                    role: 'victim',
                    isHelperAvailable: false,
                    status: { isActive: true, isVerified: true },
                    profileSetup: {
                        personalDetailsCompleted: false,
                        emergencyContactsCompleted: false,
                        medicalProfileCompleted: false,
                        pinSetupCompleted: false,
                        completedAt: null
                    },
                },
            },
            { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
        );

        await syncRedisHelperState(req, user);

        res.status(200).json({
            message: "User profile synced successfully.",
            user,
        });
    } catch (error) {
        console.error("Authenticated Sync Error:", error.message);
        res.status(500).json({ error: "Server error syncing authenticated user." });
    }
};

// READ: Get User Profile
exports.getUserProfile = async (req, res) => {
    try {
        // req.user.cognitoId is provided by the AWS auth.js middleware
        const user = await User.findOne({ cognitoId: req.user.cognitoId });
        
        if (!user) {
            return res.status(404).json({ message: "User profile not found" });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error("Fetch Profile Error:", error.message);
        res.status(500).json({ error: "Server error fetching profile" });
    }
};

exports.getSOSHistory = async (req, res) => {
    try {
        const user = await User.findOne({ cognitoId: req.user.cognitoId })
            .select('_id')
            .lean();

        if (!user) {
            return res.status(404).json({ message: "User profile not found" });
        }

        const userId = String(user._id);
        const [victimCreatedEvents, helperAcceptedEvents, helperCompletedEvents, cannotHandleEvents] = await Promise.all([
            IncidentEvent.find({
                eventType: 'INCIDENT_CREATED',
                'details.victimUserId': userId,
            })
                .sort({ ts: -1 })
                .limit(60)
                .lean(),
            IncidentEvent.find({
                eventType: 'HELPER_ACCEPTED',
                helperId: userId,
            })
                .sort({ ts: -1 })
                .limit(60)
                .lean(),
            IncidentEvent.find({
                eventType: 'INCIDENT_COMPLETED',
                helperId: userId,
                'details.reason': 'helped',
            })
                .sort({ ts: -1 })
                .limit(60)
                .lean(),
            IncidentEvent.find({
                eventType: 'HELPER_CANCELLED',
                helperId: userId,
                'details.reason': 'cannot_handle',
            })
                .sort({ ts: -1 })
                .limit(60)
                .lean(),
        ]);

        const seedEvents = [
            ...victimCreatedEvents,
            ...helperAcceptedEvents,
            ...helperCompletedEvents,
            ...cannotHandleEvents,
        ];
        const incidentIds = [
            ...new Set(seedEvents.map((event) => event.incidentId).filter(Boolean)),
        ];

        if (!incidentIds.length) {
            return res.status(200).json({
                victimEvents: [],
                helperEvents: [],
                events: [],
            });
        }

        const allEvents = await IncidentEvent.find({
            incidentId: { $in: incidentIds },
        })
            .sort({ ts: 1 })
            .lean();
        const eventsByIncident = allEvents.reduce((acc, event) => {
            if (!acc[event.incidentId]) {
                acc[event.incidentId] = [];
            }
            acc[event.incidentId].push(event);
            return acc;
        }, {});
        const victimIds = allEvents
            .filter((event) => event.eventType === 'INCIDENT_CREATED')
            .map((event) => event.details?.victimUserId);
        const namesById = await getNamesById(victimIds);
        const helperIncidentIds = [
            ...new Set(
                [
                    ...helperAcceptedEvents,
                    ...helperCompletedEvents,
                    ...cannotHandleEvents,
                ]
                    .map((event) => event.incidentId)
                    .filter(Boolean)
            ),
        ];

        const victimEvents = victimCreatedEvents
            .map((createdEvent) =>
                buildVictimHistoryItem({
                    createdEvent,
                    events: eventsByIncident[createdEvent.incidentId] || [createdEvent],
                })
            )
            .sort((a, b) => new Date(b.sosPressedAt).getTime() - new Date(a.sosPressedAt).getTime())
            .slice(0, 60);

        const helperEvents = helperIncidentIds
            .map((incidentId) => {
                const events = eventsByIncident[incidentId] || [];
                const createdEvent = getIncidentCreatedEvent(events);
                const victimUserId = createdEvent?.details?.victimUserId;
                const victimName = namesById[String(victimUserId || '')] || 'the victim';
                return buildHelperRoleHistoryItem({
                    helperId: userId,
                    events,
                    createdEvent,
                    victimName,
                });
            })
            .filter((event) => event.incidentId)
            .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
            .slice(0, 60);

        const historyItems = [...victimEvents, ...helperEvents]
            .sort((a, b) => {
                const aTime = new Date(a.occurredAt || a.sosPressedAt).getTime();
                const bTime = new Date(b.occurredAt || b.sosPressedAt).getTime();
                return bTime - aTime;
            })
            .slice(0, 100);

        res.status(200).json({
            victimEvents,
            helperEvents,
            events: historyItems,
        });
    } catch (error) {
        console.error("SOS History Error:", error.message);
        res.status(500).json({ error: "Server error fetching SOS history." });
    }
};

// UPDATE: Dynamic Profile Update (Complete Profile & Medical)
exports.updateProfile = async (req, res) => {
    try {
        const updateData = { ...(req.body || {}) };
        const existingUser = await User.findOne({ cognitoId: req.user.cognitoId }).lean();

        // Security check: Prevent users from overriding their IDs
        delete updateData.cognitoId;
        delete updateData._id;
        delete updateData.email;
        delete updateData.createdAt;
        delete updateData.updatedAt;

        if (
            typeof updateData.firstName === 'string'
            || typeof updateData.lastName === 'string'
        ) {
            const nextFirstName = typeof updateData.firstName === 'string'
                ? updateData.firstName
                : existingUser?.firstName;
            const nextLastName = typeof updateData.lastName === 'string'
                ? updateData.lastName
                : existingUser?.lastName;

            if (nextFirstName || nextLastName) {
                updateData.name = [nextFirstName, nextLastName].filter(Boolean).join(' ').trim();
            }
        }

        // Added upsert logic so it creates the user profile if it's missing!
        const firstName = req.user?.firstName || '';
        const lastName = req.user?.lastName || '';
        const email = req.user?.email || '';
        const profileSetupPatch = buildProfileSetupPatch(updateData, existingUser);
        const setFields = {
            ...updateData,
            ...profileSetupPatch,
        };
        const setOnInsertFields = removeConflictingSetOnInsertFields(
            setFields,
            {
                cognitoId: req.user.cognitoId,
                email,
                firstName,
                lastName,
                name: [firstName, lastName].filter(Boolean).join(' ').trim(),
                role: 'victim',
                status: { isActive: true, isVerified: true },
            }
        );

        const updatedUser = await User.findOneAndUpdate(
            { cognitoId: req.user.cognitoId },
            {
                $set: setFields,
                $setOnInsert: setOnInsertFields,
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true,
                runValidators: true,
            }
        );


        res.status(200).json({ 
            message: "Profile updated successfully", 
            user: updatedUser 
        });
    } catch (error) {
        console.error("Update Profile Error:", error.message);
        const isClientDataError = error.name === 'ValidationError' || error.code === 11000;
        res.status(isClientDataError ? 400 : 500).json({
            error: isClientDataError ? "Invalid profile update data." : "Server error updating profile",
            message: error.message,
        });
    }
};

// DELETE: Account Deletion
exports.deleteAccount = async (req, res) => {
    try {
        const user = await User.findOneAndDelete({ cognitoId: req.user.cognitoId });
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "Account profile permanently deleted from MongoDB." });
    } catch (error) {
        console.error("Delete Account Error:", error.message);
        res.status(500).json({ error: "Server error deleting account" });
    }
};

exports.setSecurityPin = async (req, res) => {
    try {
        const { pin } = req.body || {};

        if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
            return res.status(400).json({ message: "PIN must be exactly 4 digits." });
        }

        const existingUser = await User.findOne({ cognitoId: req.user.cognitoId }).lean();
        const existingSetup = existingUser?.profileSetup || {};
        const pinHash = await bcrypt.hash(pin, 12);

        const nextSetup = {
            personalDetailsCompleted: Boolean(existingSetup.personalDetailsCompleted),
            emergencyContactsCompleted: Boolean(existingSetup.emergencyContactsCompleted),
            medicalProfileCompleted: Boolean(existingSetup.medicalProfileCompleted || existingSetup.completedAt),
            pinSetupCompleted: true,
        };
        const isSetupComplete =
            nextSetup.personalDetailsCompleted
            && nextSetup.emergencyContactsCompleted
            && nextSetup.medicalProfileCompleted
            && nextSetup.pinSetupCompleted;

        const setFields = {
            'security.pinHash': pinHash,
            'security.pinUpdatedAt': new Date(),
            'profileSetup.personalDetailsCompleted': nextSetup.personalDetailsCompleted,
            'profileSetup.emergencyContactsCompleted': nextSetup.emergencyContactsCompleted,
            'profileSetup.medicalProfileCompleted': nextSetup.medicalProfileCompleted,
            'profileSetup.pinSetupCompleted': true,
            'profileSetup.completedAt': isSetupComplete
                ? existingSetup.completedAt || new Date()
                : null,
        };
        const firstName = req.user?.firstName || '';
        const lastName = req.user?.lastName || '';
        const setOnInsertFields = removeConflictingSetOnInsertFields(
            setFields,
            {
                cognitoId: req.user.cognitoId,
                email: req.user?.email || '',
                firstName,
                lastName,
                name: [firstName, lastName].filter(Boolean).join(' ').trim(),
                role: 'victim',
                status: { isActive: true, isVerified: true },
            }
        );

        const user = await User.findOneAndUpdate(
            { cognitoId: req.user.cognitoId },
            {
                $set: setFields,
                $setOnInsert: setOnInsertFields,
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true,
                runValidators: true,
            }
        );

        res.status(200).json({
            message: "Security PIN saved successfully.",
            user,
        });
    } catch (error) {
        console.error("Set Security PIN Error:", error.message);
        res.status(500).json({ error: "Server error saving security PIN." });
    }
};

exports.verifySecurityPin = async (req, res) => {
    try {
        const { pin } = req.body || {};

        if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
            return res.status(400).json({ message: "PIN must be exactly 4 digits." });
        }

        const user = await User.findOne({ cognitoId: req.user.cognitoId }).select('+security.pinHash');

        if (!user?.security?.pinHash) {
            return res.status(409).json({
                verified: false,
                message: "Security PIN has not been set for this account.",
            });
        }

        const verified = await bcrypt.compare(pin, user.security.pinHash);

        res.status(200).json({ verified });
    } catch (error) {
        console.error("Verify Security PIN Error:", error.message);
        res.status(500).json({ error: "Server error verifying security PIN." });
    }
};

exports.updateDevice = async (req, res) => {
    try {
        const { fcmToken, role } = req.body || {};
        const update = {};

        if (typeof fcmToken === 'string' || fcmToken === null) {
            update.fcmToken = fcmToken;
        }

        if (typeof role === 'string') {
            update.role = role;
        }

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ message: "No valid device fields provided." });
        }

        const user = await User.findOneAndUpdate(
            { cognitoId: req.user.cognitoId },
            { $set: update },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        await syncRedisHelperState(req, user);

        res.status(200).json(user);
    } catch (error) {
        console.error("Update Device Error:", error.message);
        res.status(500).json({ error: "Server error updating device info." });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { isHelperAvailable, lastKnownLocation, role } = req.body || {};
        const update = {};

        if (typeof isHelperAvailable === 'boolean') {
            update.isHelperAvailable = isHelperAvailable;
        }

        if (typeof role === 'string') {
            update.role = role;
        }

        if (
            lastKnownLocation
            && Number.isFinite(Number(lastKnownLocation.lat))
            && Number.isFinite(Number(lastKnownLocation.lng))
        ) {
            update.lastKnownLocation = {
                lat: Number(lastKnownLocation.lat),
                lng: Number(lastKnownLocation.lng),
                updatedAt: new Date(),
            };
        }

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ message: "No valid status fields provided." });
        }

        const user = await User.findOneAndUpdate(
            { cognitoId: req.user.cognitoId },
            { $set: update },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        await syncRedisHelperState(req, user);

        res.status(200).json(user);
    } catch (error) {
        console.error("Update Status Error:", error.message);
        res.status(500).json({ error: "Server error updating user status." });
    }
};
