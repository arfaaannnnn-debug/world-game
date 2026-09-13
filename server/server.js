const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

// Serve the client folder as static files
app.use(express.static(path.join(__dirname, '..', 'client')));

// ---- In-memory game state ----
// players: { socketId: { id, username, x, y, z, ry, anim } }
const players = {};

// ---- Validation helpers ----
function sanitizeUsername(raw) {
  if (typeof raw !== 'string') return null;
  let name = raw.trim().replace(/[<>"'`]/g, '');
  if (name.length < 1) return null;
  if (name.length > 16) name = name.slice(0, 16);
  return name;
}

function sanitizeMessage(raw) {
  if (typeof raw !== 'string') return null;
  let msg = raw.trim().replace(/[<>]/g, '');
  if (msg.length < 1) return null;
  if (msg.length > 250) msg = msg.slice(0, 250);
  return msg;
}

function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

// crude per-socket rate limiting for chat/movement spam
function makeLimiter(maxEvents, windowMs) {
  const hits = new Map();
  return (id) => {
    const now = Date.now();
    const arr = (hits.get(id) || []).filter((t) => now - t < windowMs);
    arr.push(now);
    hits.set(id, arr);
    return arr.length <= maxEvents;
  };
}
const chatLimiter = makeLimiter(8, 5000); // 8 messages / 5s
const moveLimiter = makeLimiter(40, 1000); // 40 updates / 1s

function publicPlayerList() {
  return Object.values(players).map((p) => ({ id: p.id, username: p.username }));
}

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  socket.on('join', (data) => {
    const username = sanitizeUsername(data && data.username);
    if (!username) {
      socket.emit('join-error', { message: 'Invalid username.' });
      return;
    }

    players[socket.id] = {
      id: socket.id,
      username,
      x: 0,
      y: 0,
      z: 0,
      ry: 0,
      anim: 'idle',
    };

    // Tell the new player about everyone already in the world
    socket.emit('init', {
      id: socket.id,
      players: Object.values(players).filter((p) => p.id !== socket.id),
    });

    // Tell everyone else that a new player joined
    socket.broadcast.emit('player-joined', players[socket.id]);

    io.emit('player-list', publicPlayerList());
    io.emit('online-count', Object.keys(players).length);
  });

  socket.on('move', (data) => {
    const p = players[socket.id];
    if (!p) return;
    if (!moveLimiter(socket.id)) return;
    if (!data) return;
    const { x, y, z, ry, anim } = data;
    if (![x, y, z, ry].every(isFiniteNumber)) return;

    p.x = Math.max(-500, Math.min(500, x));
    p.y = Math.max(-50, Math.min(50, y));
    p.z = Math.max(-500, Math.min(500, z));
    p.ry = ry;
    p.anim = typeof anim === 'string' && anim.length < 20 ? anim : 'idle';

    socket.broadcast.emit('player-moved', {
      id: socket.id,
      x: p.x,
      y: p.y,
      z: p.z,
      ry: p.ry,
      anim: p.anim,
    });
  });

  socket.on('global-chat', (data) => {
    const p = players[socket.id];
    if (!p) return;
    if (!chatLimiter(socket.id)) return;
    const msg = sanitizeMessage(data && data.message);
    if (!msg) return;
    io.emit('global-chat', { username: p.username, message: msg, ts: Date.now() });
  });

  socket.on('private-message', (data) => {
    const p = players[socket.id];
    if (!p) return;
    if (!chatLimiter(socket.id)) return;
    const targetId = data && data.targetId;
    const msg = sanitizeMessage(data && data.message);
    if (!msg || !targetId || !players[targetId]) return;

    const payload = { fromId: socket.id, fromUsername: p.username, message: msg, ts: Date.now() };
    io.to(targetId).emit('private-message', payload);
    // echo back to sender so their own chat window updates
    socket.emit('private-message-sent', { toId: targetId, message: msg, ts: Date.now() });
  });

  socket.on('disconnect', () => {
    if (players[socket.id]) {
      console.log(`[disconnect] ${players[socket.id].username} (${socket.id})`);
      delete players[socket.id];
      io.emit('player-left', { id: socket.id });
      io.emit('player-list', publicPlayerList());
      io.emit('online-count', Object.keys(players).length);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Open World Game server running at http://localhost:${PORT}`);
});
