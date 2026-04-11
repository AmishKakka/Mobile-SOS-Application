const User = require('../models/User.js'); // Assuming your Mongoose schema is saved here
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


// CREATE: Register a new user (AuthScreen.tsx)
exports.registerUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        //Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "Email already in use." });
        }

        //Hash the password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        //Create the new user object and save to database
        user = new User({
            firstName,
            lastName,
            email,
            passwordHash,
            role: "BOTH", // Default role
            status: { isActive: true, isVerified: false }
        });

        await user.save();

        //Generate JWT Token
        const payload = {
            user: { id: user._id }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'fallback_secret_key',
            { expiresIn: '30d' }, //Token valid for 30 days
            (err, token) => {
                if (err) throw err;
                res.status(201).json({ 
                    message: "User registered successfully", 
                    token, 
                    userId: user._id 
                });
            }
        );
    } catch (error) {
        console.error("Registration Error:", error.message);
        res.status(500).json({ error: "Server error during registration" });
    }
};


// READ: Get User Profile (Settings Dashboard)

exports.getUserProfile = async (req, res) => {
    try {
        //req.user.id is provided by the auth.js middleware
        const user = await User.findById(req.user.id).select('-passwordHash');
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
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
        const userId = req.user.id;
        const updateData = req.body;

        // Security check: Prevent users from updating their password or ID via this route
        delete updateData.passwordHash;
        delete updateData._id;

        // findByIdAndUpdate with $set dynamically applies whatever fields the React Native app sends
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true } 
        ).select('-passwordHash');

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


// DELETE: Account Deletion with Double Verification

exports.deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        const { password } = req.body; 

        if (!password) {
            return res.status(400).json({ message: "Password is required to delete account." });
        }

        //Find user to get the password hash
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        //Verify the provided password matches the database
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: "Incorrect password. Account deletion aborted." });
        }

        //Delete the user
        await User.findByIdAndDelete(userId);

        res.status(200).json({ message: "Account permanently deleted." });
    } catch (error) {
        console.error("Delete Account Error:", error.message);
        res.status(500).json({ error: "Server error deleting account" });
    }
};