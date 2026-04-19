const User = require('../models/User.js');
const { syncHelperAvailabilityIndex } = require('../services/helperAvailabilityIndex');

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
            status: { isActive: true, isVerified: true }
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
            { cognitoId },
            {
                $set: update,
                $setOnInsert: {
                    role: 'victim',
                    isHelperAvailable: false,
                    status: { isActive: true, isVerified: true },
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
            return res.status(404).json({ message: "User database profile not found" });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error("Fetch Profile Error:", error.message);
        res.status(500).json({ error: "Server error fetching profile" });
    }
};


// UPDATE: Dynamic Profile Update (Complete Profile & Medical)
exports.updateProfile = async (req, res) => {
    try {
        const updateData = req.body;

        // Security check: Prevent users from overriding their IDs
        delete updateData.cognitoId;
        delete updateData._id;

        if (
            typeof updateData.firstName === 'string'
            || typeof updateData.lastName === 'string'
        ) {
            const existingUser = await User.findOne({ cognitoId: req.user.cognitoId }).lean();
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

        // Find the user by their AWS ID and update
        const updatedUser = await User.findOneAndUpdate(
            { cognitoId: req.user.cognitoId },
            { $set: updateData },
            { new: true, runValidators: true } 
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ 
            message: "Profile updated successfully", 
            user: updatedUser 
        });
    } catch (error) {
        console.error("Update Profile Error:", error.message);
        res.status(500).json({ error: "Server error updating profile" });
    }
};


// DELETE: Account Deletion
exports.deleteAccount = async (req, res) => {
    try {
        // Because AWS handles passwords, we don't ask for a password here anymore.
        // Instead, the frontend should force the user to re-authenticate with AWS 
        // before they are allowed to press the Delete Account button.
        
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
