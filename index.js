// const express = require('express');
// const DBconnection = require('./config/Dbconfig');
// const dotenv = require('dotenv').config();
// const cors = require('cors')
//  const userRouter = require('./routes/authroutes')

//  const app = express()
//  app.use(express.urlencoded({ extended: true }));
// app.use(cors())
// app.use(express.json())
// DBconnection()


// // Routes 
// app.use('/user', userRouter)


// const PORT= process.env.PORT || 3000 ;

// app.listen(PORT, () => {
//   console.log(`Server is running on port  ${PORT}`);
// });









// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const cors = require('cors');
// const dotenv = require('dotenv').config();

// const DBconnection = require('./config/Dbconfig');
// const userRouter = require('./routes/authroutes');
// const messageRouter = require('./routes/messageRoutes'); // create this next
// const groupRouter = require('./routes/groupRoutes')
// const app = express();
// const server = http.createServer(app); // for socket.io
// const io = new Server(server, {
//   cors: {
//     origin: '*',
//     methods: ['GET', 'POST']
//   }
// });

// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// DBconnection();

// // Routes
// app.use('/user', userRouter);
// app.use('/api/messages', messageRouter); // messages route
// app.use('/api/groups', groupRouter); // messages route

// // 👇 Socket.IO connections
// io.on('connection', (socket) => {
//   console.log('User connected:', socket.id);

//   socket.on('joinRoom', ({ senderId, receiverId }) => {
//     const room = [senderId, receiverId].sort().join('_');
//     socket.join(room);
//   });

//   socket.on('sendMessage', (data) => {
//     const room = [data.senderId, data.receiverId].sort().join('_');
//     io.to(room).emit('receiveMessage', data); // broadcast to both users
//   });

//   socket.on('disconnect', () => {
//     console.log('User disconnected');
//   });
// });


// // for group message

// // io.on('connection', (socket) => {
// //   console.log('User connected:', socket.id);

// //   socket.on('joinGroup', (groupId) => {
// //     socket.join(groupId);
// //     console.log(`User joined group ${groupId}`);
// //   });

// //   socket.on('sendGroupMessage', (data) => {
// //     io.to(data.groupId).emit('receiveGroupMessage', data);
// //   });

// //   socket.on('disconnect', () => console.log('User disconnected'));
// // });


// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => console.log(`Server running on port ${PORT}`));









// group message

// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const cors = require('cors');
// const dotenv = require('dotenv').config();

// const DBconnection = require('./config/Dbconfig');
// const userRouter = require('./routes/authroutes');
// const messageRouter = require('./routes/messageRoutes');
// const groupRouter = require('./routes/groupRoutes');

// const app = express();
// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: '*',
//     methods: ['GET', 'POST'],
//   },
// });

// app.set('io', io); // ✅ this line is critical!

// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// DBconnection();

// // Routes
// app.use('/user', userRouter);
// app.use('/api/messages', messageRouter);
// app.use('/api/groups', groupRouter);

// // Socket.IO group connection
// io.on('connection', (socket) => {
//   console.log('User connected:', socket.id);

//   socket.on('joinGroup', (groupId) => {
//     socket.join(groupId);
//     console.log(`User joined group ${groupId}`);
//   });

//   socket.on('disconnect', () => {
//     console.log('User disconnected');
//   });
// });

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => console.log(`Server running on port ${PORT}`));










// for both 

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv').config();

const DBconnection = require('./config/Dbconfig');
const userRouter = require('./routes/authroutes');
const messageRouter = require('./routes/messageRoutes');
const groupRouter = require('./routes/groupRoutes');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.set('io', io); // expose io to use it in route handlers if needed

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

DBconnection();

// API routes
app.use('/user', userRouter);
app.use('/api/messages', messageRouter);
app.use('/api/groups', groupRouter);

const onlineUsers = new Map(); //
// ✅ Socket.IO connections for both personal and group messaging
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);


  // socket.on("userOnline", (userId) => {
  //   onlineUsers.set(userId, socket.id);
  //   console.log(`User ${userId} is online`);
  //   io.emit("updateUserStatus", { userId, status: "online" });
  // });
  socket.on("userOnline", (userId) => {
  onlineUsers.set(userId, socket.id);
  console.log(`User ${userId} is online`);

  // Inform everyone else
  io.emit("updateUserStatus", { userId, status: "online" });

  // ✅ Send all currently online users back to this user
  const onlineUserIds = Array.from(onlineUsers.keys());
  socket.emit("initialOnlineUsers", onlineUserIds);
});


 
  socket.on("disconnect", () => {
    for (let [userId, id] of onlineUsers.entries()) {
      if (id === socket.id) {
        onlineUsers.delete(userId);
        console.log(`User ${userId} disconnected`);
        io.emit("updateUserStatus", { userId, status: "offline" });
        break;
      }
    }
  });




  // --- PERSONAL CHAT ---
  socket.on('joinRoom', ({ senderId, receiverId }) => {
    const room = [senderId, receiverId].sort().join('_');
    socket.join(room);
    console.log(`User joined personal room: ${room}`);
  });

  // socket.on('sendMessage', (data) => {
  //   const room = [data.senderId, data.receiverId].sort().join('_');
  //   io.to(room).emit('receiveMessage', data);
  //   console.log(`Message sent in room ${room}:`, data);
  // });




  // --- GROUP CHAT ---
 
  socket.on('sendMessage', (data) => {
  const room = [data.senderId, data.receiverId].sort().join('_');
  
  // Send message to room
  io.to(room).emit('receiveMessage', data);

  // ✅ Notify both sender and receiver to move the other user to top
  const senderSocket = onlineUsers.get(data.senderId);
  const receiverSocket = onlineUsers.get(data.receiverId);

  if (senderSocket) {
    io.to(senderSocket).emit('moveUserToTop', { userId: data.receiverId });
  }

  if (receiverSocket) {
    io.to(receiverSocket).emit('moveUserToTop', { userId: data.senderId });
  }

  console.log(`Message sent in room ${room}:`, data);
});

 
  socket.on('joinGroup', (groupId) => {
    socket.join(groupId);
    console.log(`User joined group: ${groupId}`);
  });

  socket.on('sendGroupMessage', (data) => {
    io.to(data.groupId).emit('receiveGroupMessage', data);
    console.log(`Group message sent in ${data.groupId}:`, data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// show status online not issue in refresh the page issue in recevier not see immediately
// io.on('connection', (socket) => {
//   console.log('User connected:', socket.id);

//   socket.on("userOnline", (userId) => {
//     onlineUsers.set(userId, socket.id);
//     console.log(`User ${userId} is online`);

//     // Broadcast new user status
//     io.emit("updateUserStatus", { userId, status: "online" });

//     // ✅ Send all currently online users to just the new one
//     const currentlyOnline = Array.from(onlineUsers.keys());
//     socket.emit("initialOnlineUsers", currentlyOnline);
//   });

//   socket.on("disconnect", () => {
//     for (let [userId, id] of onlineUsers.entries()) {
//       if (id === socket.id) {
//         onlineUsers.delete(userId);
//         console.log(`User ${userId} disconnected`);
//         io.emit("updateUserStatus", { userId, status: "offline" });
//         break;
//       }
//     }
//   });
// });

 




const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

