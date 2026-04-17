const User = require('../models/User.js');

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
            role: "BOTH", 
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