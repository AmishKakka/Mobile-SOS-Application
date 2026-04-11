const mongoose = require('mongoose');

// Helper to limit emergency contacts to 5
function arrayLimit(val) {
  return val.length <= 5;
}

const userSchema = new mongoose.Schema({
    // Auth & Basic Info
    firstName: { type: String, required: true, minlength: 1, maxlength: 120 },
    lastName: { type: String, required: true, minlength: 1, maxlength: 120 },
    email: { type: String, required: true, unique: true, maxlength: 254 },
    passwordHash: { type: String, required: true },

    // Extended Profile
    phone: { type: String, maxlength: 20 },
    address: { type: String },
    height: { type: String },
    weight: { type: String },

    // Medical Profile (Optional)
    medical: {
        bloodGroup: { type: String, enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", null], default: null },
        allergies: [{ type: String }],
        conditions: [{ type: String }],
        medications: [{ type: String }],
        notes: { type: String, maxlength: 500 }
    },

    // Emergency Contacts (Matches your UI)
    emergencyContacts: {
        type: [{
            name: { type: String, required: true },
            relation: { type: String },
            phone: { type: String, required: true }
        }],
        validate: [arrayLimit, '{PATH} exceeds the limit of 5']
    },

    // System App Logic
    role: { type: String, enum: ["PIN", "HELPER", "BOTH"], default: "BOTH" },
    status: {
        isActive: { type: Boolean, default: true },
        isVerified: { type: Boolean, default: false }
    },
    helperProfile: {
        isHelper: { type: Boolean, default: true },
        skills: [{ type: String }],
        isAvailableForSOS: { type: Boolean, default: true }
    }
}, { timestamps: true }); // Automatically handles createdAt and updatedAt

module.exports = mongoose.model('User', userSchema);