const mongoose = require('mongoose');

const EmergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    phoneNumber: { type: String, trim: true },
    fcmToken: { type: String, trim: true },
  },
  { _id: false },
);

const UserSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true, trim: true },
    name: { type: String, trim: true },
    role: {
      type: String,
      enum: ['victim', 'helper', 'contact'],
      default: 'victim',
    },
    fcmToken: { type: String, trim: true, default: null },
    isHelperAvailable: { type: Boolean, default: false },
    lastKnownLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },
    emergencyContacts: {
      type: [EmergencyContactSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    minimize: false,
  },
);

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
