const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const { auth, adminOnly } = require('../middleware/auth');

// Admin: Send notification
router.post('/send', auth, adminOnly, async (req, res) => {
  try {
    const { title, message, type, recipientId } = req.body;
    if (!title || !message || !type)
      return res.status(400).json({ message: 'title, message, and type are required' });

    // recipientId = null means broadcast to all users
    const notification = new Notification({
      title,
      message,
      type,
      sender: req.user._id,
      recipient: recipientId || null
    });
    await notification.save();

    const populated = await notification.populate('sender', 'username email');

    // Emit via socket
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers'); // Map: userId -> socketId

    if (recipientId) {
      // Direct to specific user
      const socketId = onlineUsers.get(recipientId.toString());
      if (socketId) {
        io.to(socketId).emit('new_notification', populated);
      }
    } else {
      // Broadcast to all users except admin
      io.emit('new_notification', populated);
    }

    res.status(201).json({ notification: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// User: Get my notifications
router.get('/mine', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [{ recipient: req.user._id }, { recipient: null }]
    })
      .populate('sender', 'username email')
      .sort({ createdAt: -1 });

    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// User: Mark as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Not found' });

    notification.isRead = true;
    await notification.save();
    res.json({ notification });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// User: Mark toast as shown (so it won't show again on next login)
router.patch('/:id/toast-shown', auth, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isToastShown: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// User: Mark all as read
router.patch('/mark-all-read', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { $or: [{ recipient: req.user._id }, { recipient: null }], isRead: false },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Get sent notifications
router.get('/sent', auth, adminOnly, async (req, res) => {
  try {
    const notifications = await Notification.find({ sender: req.user._id })
      .populate('recipient', 'username email')
      .sort({ createdAt: -1 });

    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Get all users (for targeting)
router.get('/users', auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('username email');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
