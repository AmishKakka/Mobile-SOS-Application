const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String },
  fcmToken: { type: String }, 
  emergencyContacts: [{
    name: String,
    phoneNumber: String,
    fcmToken: String 
  }]
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);