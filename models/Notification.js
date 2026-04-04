const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['direct', 'toast'], // direct = stays in tab, toast = shows as toast on login + stores
    required: true
  },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = all users
  isRead: { type: Boolean, default: false },
  isToastShown: { type: Boolean, default: false }, // tracks if toast was shown to user
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
