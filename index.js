require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE'] }
});

app.use(cors());
app.use(express.json());

const onlineUsers = new Map();
app.set('io', io);
app.set('onlineUsers', onlineUsers);

io.on('connection', (socket) => {
  socket.on('register_user', (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
  });

  socket.on('disconnect', () => {
    if (socket.userId) onlineUsers.delete(socket.userId);
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('/', (req, res) => res.json({ message: 'NotifyApp API running' }));

// Connect DB and seed admin
const connectAndSeed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');

  // Seed default admin if not exists
  const adminExists = await User.findOne({ role: 'admin' });
  if (!adminExists) {
    const admin = new User({
      username: 'admin',
      email: 'admin@notifyapp.com',
      password: 'Admin@123',
      role: 'admin'
    });
    await admin.save();
    console.log('Default admin created: admin@notifyapp.com / Admin@123');
  }
};

connectAndSeed().then(() => {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('Startup error:', err);
  process.exit(1);
});
