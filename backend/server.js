const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

const JWT_SECRET = process.env.JWT_SECRET || 'couple-chat-secret-change-in-production';
const PORT = process.env.PORT || 3001;

// Allowed origins from env or defaults
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:4173', 'http://localhost:5174'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:4173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());

// ─── USERS ───────────────────────────────────────────────────────────────────
// Two fixed users — change passwords via env vars
const USERS = [
  {
    id: 'user1',
    username: process.env.USER1_NAME || 'Sarojana',
    passwordHash: bcrypt.hashSync(process.env.USER1_PASS || 'love24', 10),
    avatar: '🌸',
    color: '#e879a0'
  },
  {
    id: 'user2',
    username: process.env.USER2_NAME || 'Rushi',
    passwordHash: bcrypt.hashSync(process.env.USER2_PASS || 'love24', 10),
    avatar: '🌙',
    color: '#a78bfa'
  }
];

// In-memory message store (swap with DB for persistence)
let messages = [];
let typingUsers = new Set();
let onlineUsers = new Map(); // socketId -> userId
let userSocketMap = new Map(); // userId -> socketId

// ─── AUTH ─────────────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = USERS.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, avatar: user.avatar, color: user.color }
  });
});

app.get('/api/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = USERS.find(u => u.id === decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json({ id: user.id, username: user.username, avatar: user.avatar, color: user.color });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ─── MESSAGES ─────────────────────────────────────────────────────────────────
app.get('/api/messages', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });

  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, JWT_SECRET);
    res.json(messages.slice(-200)); // last 200 messages
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────
const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = USERS.find(u => u.id === decoded.id);
    if (!user) return next(new Error('User not found'));
    socket.user = user;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
};

io.use(authenticateSocket);

io.on('connection', (socket) => {
  const user = socket.user;
  onlineUsers.set(socket.id, user.id);
  userSocketMap.set(user.id, socket.id);

  console.log(`${user.username} connected`);

  // Broadcast updated online status
  const getOnlineUserIds = () => [...new Set(onlineUsers.values())];
  io.emit('online_users', getOnlineUserIds());

  socket.on('send_message', (data) => {
    if (!data.text || typeof data.text !== 'string') return;
    const text = data.text.trim().slice(0, 1000);
    if (!text) return;

    const message = {
      id: Date.now() + Math.random().toString(36).slice(2),
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      color: user.color,
      text,
      isEncrypted: data.isEncrypted || false,
      timestamp: new Date().toISOString(),
      reaction: null
    };

    messages.push(message);
    if (messages.length > 500) messages = messages.slice(-500); // keep last 500

    io.emit('message', message);

    // Stop typing on send
    typingUsers.delete(user.id);
    io.emit('typing_users', [...typingUsers]);
  });

  socket.on('send_file', (data) => {
    const { file, text, isEncrypted } = data;
    if (!file || !file.data || !file.type || !file.name) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/ogg'];
    if (!allowedTypes.includes(file.type)) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) return;

    const message = {
      id: Date.now() + Math.random().toString(36).slice(2),
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      color: user.color,
      text: text || '',
      isEncrypted: isEncrypted || false,
      file: {
        name: file.name,
        type: file.type,
        size: file.size,
        data: file.data
      },
      timestamp: new Date().toISOString(),
      reaction: null
    };

    messages.push(message);
    if (messages.length > 500) messages = messages.slice(-500);

    io.emit('file_message', message);

    // Stop typing on send
    typingUsers.delete(user.id);
    io.emit('typing_users', [...typingUsers]);
  });

  socket.on('typing_start', () => {
    typingUsers.add(user.id);
    socket.broadcast.emit('typing_users', [...typingUsers]);
  });

  socket.on('typing_stop', () => {
    typingUsers.delete(user.id);
    socket.broadcast.emit('typing_users', [...typingUsers]);
  });

  socket.on('react_message', ({ messageId, reaction }) => {
    const msg = messages.find(m => m.id === messageId);
    if (msg) {
      msg.reaction = reaction;
      io.emit('message_reaction', { messageId, reaction });
    }
  });

  socket.on('call_offer', ({ targetUserId, offer, type }) => {
    const targetSocketId = userSocketMap.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_offer', {
        fromUserId: user.id,
        offer,
        type
      });
    }
  });

  socket.on('call_answer', ({ targetUserId, answer }) => {
    const targetSocketId = userSocketMap.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_answer', {
        fromUserId: user.id,
        answer
      });
    }
  });

  socket.on('ice_candidate', ({ targetUserId, candidate }) => {
    const targetSocketId = userSocketMap.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice_candidate', {
        fromUserId: user.id,
        candidate
      });
    }
  });

  socket.on('end_call', ({ targetUserId }) => {
    const targetSocketId = userSocketMap.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('end_call', { fromUserId: user.id });
    }
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    userSocketMap.delete(user.id);
    typingUsers.delete(user.id);
    console.log(`${user.username} disconnected`);
    io.emit('online_users', getOnlineUserIds());
    io.emit('typing_users', [...typingUsers]);
  });
});

// ─── SERVE FRONTEND IN PRODUCTION ─────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`\n💞 Couple Chat Server running on port ${PORT}`);
  console.log(`👤 User 1: ${USERS[0].username}`);
  console.log(`👤 User 2: ${USERS[1].username}`);
  console.log(`🔑 Change credentials via ENV: USER1_NAME, USER1_PASS, USER2_NAME, USER2_PASS\n`);
});
