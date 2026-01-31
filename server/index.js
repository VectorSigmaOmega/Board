const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// MEMORY STORE
let rooms = {}; // { "roomID": [line1, line2...] }
let users = {}; // { "socketID": { name, color, roomId } }

// CONFIG
const MAX_USERS_PER_ROOM = 15;

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", ({ name, color, roomId }) => {
    // 1. CHECK CAPACITY
    // Count how many sockets are currently in this room
    const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0;

    if (roomSize >= MAX_USERS_PER_ROOM) {
      socket.emit("room_full");
      return;
    }

    // 2. JOIN LOGIC
    socket.join(roomId);
    users[socket.id] = { name, color, roomId };

    // Initialize room if new
    if (!rooms[roomId]) {
        rooms[roomId] = [];
    }

    // Send History
    socket.emit("load_history", rooms[roomId]);

    // Broadcast User List
    const usersInRoom = Object.values(users).filter(u => u.roomId === roomId);
    io.to(roomId).emit("update_users", usersInRoom);
  });

  socket.on("draw_line", (data) => {
    const { roomId } = data;
    if (rooms[roomId]) {
        rooms[roomId].push(data);
        socket.to(roomId).emit("draw_line", data);
    }
  });

  socket.on("clear_canvas", (roomId) => {
    if (rooms[roomId]) {
        rooms[roomId] = [];
        socket.to(roomId).emit("clear_canvas");
    }
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
        const { roomId } = user;
        delete users[socket.id];
        
        // Broadcast new user list
        const usersInRoom = Object.values(users).filter(u => u.roomId === roomId);
        io.to(roomId).emit("update_users", usersInRoom);

        // --- GARBAGE COLLECTION ---
        // If no users are left in the room, delete the drawing history to save RAM
        if (usersInRoom.length === 0) {
            delete rooms[roomId];
            console.log(`Room ${roomId} deleted (Garbage Collection)`);
        }
    }
    console.log("User Disconnected", socket.id);
  });
});

server.listen(5000, () => {
  console.log("SERVER RUNNING ON PORT 5000");
});