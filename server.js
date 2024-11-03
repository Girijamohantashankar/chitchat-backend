const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const socketIO = require("socket.io");
const connectDB = require("./config/db"); 
const authMiddleware = require('./middleware/auth');
const userRoutes = require('./routes/user');
const chatRoutes = require('./routes/chat');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "https://chitchat-drab-ten.vercel.app", 
    methods: ["GET", "POST"],
    allowedHeaders: ["Authorization"],
    credentials: true,
  },
});

// Middleware
app.use(express.json());
app.use(cors());
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/friends", require("./routes/friends"));
app.use("/api/chat", chatRoutes);
app.use("/api/users", userRoutes);



const onlineUsers = new Map();

io.on("connection", (socket) => {
  socket.on('joinRoom', (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.join(userId);
    socket.broadcast.emit('userStatusUpdate', { userId, status: 'online' });
  });

  socket.on("sendMessage", (messageData) => {
    const { receiverId } = messageData;
    if (onlineUsers.has(receiverId)) {
      io.to(onlineUsers.get(receiverId)).emit("receiveMessage", messageData);
    } else {
      console.log(`Receiver ${receiverId} is offline`);
     
    }
  });
socket.on('userTyping', ({ senderId }) => {
  socket.broadcast.emit('userTyping', { senderId });
});

  socket.on("disconnect", () => {
    onlineUsers.forEach((value, key) => {
      if (value === socket.id) {
        onlineUsers.delete(key);
        socket.broadcast.emit('userStatusUpdate', { userId: key, status: 'offline' });
      }
    });
  });
});


// Listen on port
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
