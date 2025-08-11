
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv').config();

const DBconnection = require('./config/Dbconfig');
const userRouter = require('./routes/authroutes');
const messageRouter = require('./routes/messageRoutes');
const groupRouter = require('./routes/groupRoutes');

const Group = require('./models/group');

const app = express();
const server = http.createServer(app);
// process.env.FRONTEND_URL || '*'
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);  

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

DBconnection();

// API routes
app.use('/user', userRouter);
app.use('/api/messages', messageRouter);
app.use('/api/groups', groupRouter);

// Debug endpoint to check online users
app.get('/debug/online-users', (req, res) => {
  const onlineUsersList = Array.from(onlineUsers.entries());
  const socketMapList = Array.from(userSocketMap.entries());
  
  res.json({
    onlineUsers: onlineUsersList,
    userSocketMap: socketMapList,
    totalOnline: onlineUsers.size,
    message: "If maps are empty, frontend needs to call socket.emit('userOnline', userId)"
  });
});

// Debug endpoint to check group room memberships
app.get('/debug/group-rooms', (req, res) => {
  const rooms = {};
  
  // Get all rooms and their members
  for (let [roomName, sockets] of io.sockets.adapter.rooms) {
    if (!roomName.startsWith('/')) { // Skip default socket rooms
      rooms[roomName] = Array.from(sockets);
    }
  }
  
  res.json({
    groupRooms: rooms,
    totalRooms: Object.keys(rooms).length,
    message: "Shows which sockets are in which group rooms for video calls"
  });
});

// Manual user mapping endpoint for testing
app.post('/debug/map-user', (req, res) => {
  const { userId, socketId } = req.body;
  if (userId && socketId) {
    userSocketMap.set(userId, socketId);
    onlineUsers.set(userId, socketId);
    res.json({ 
      success: true, 
      message: `User ${userId} mapped to socket ${socketId}`,
      currentMappings: Array.from(userSocketMap.entries())
    });
  } else {
    res.status(400).json({ error: 'userId and socketId are required' });
  }
});

const onlineUsers = new Map(); // userId -> socketId mapping for online users
const userSocketMap = new Map(); // Additional mapping for video calls (same as onlineUsers but clearer naming)

// Socket.IO connections for both personal and group messaging
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  console.log('  REMINDER: User must call socket.emit("userOnline", userId) to enable video calls');

  // Helper function to get socket ID by user ID
  function getUserSocketId(userId) {
    return userSocketMap.get(userId) || onlineUsers.get(userId);
  }

  // Helper function to get user's groups from database
  async function getUserGroups(userId) {
    try {
      const groups = await Group.find({ members: userId });
      return groups;
    } catch (error) {
      console.error('Failed to fetch user groups:', error);
      return [];
    }
  }


 
  socket.on("userOnline", async (userId) => {
    onlineUsers.set(userId, socket.id);
    userSocketMap.set(userId, socket.id); // Also update video call mapping
    console.log(` User ${userId} mapped to socket ${socket.id}`);
    console.log(` Total online users: ${userSocketMap.size}`);

    try {
      const userGroups = await getUserGroups(userId);
      
      for (const group of userGroups) {
        socket.join(group._id.toString());
        console.log(` User ${userId} auto-joined group ${group._id} (${group.name})`);
      }
      
      console.log(` User ${userId} joined ${userGroups.length} group rooms for video calls`);
    } catch (error) {
      console.error(` Failed to auto-join groups for user ${userId}:`, error);
    }

    // Inform everyone else
    io.emit("updateUserStatus", { userId, status: "online" });

    //  Send all currently online users back to this user
    const onlineUserIds = Array.from(onlineUsers.keys());
    socket.emit("initialOnlineUsers", onlineUserIds);
  });


 
  socket.on("disconnect", () => {
    console.log('Socket disconnected:', socket.id);
    
    // Remove user from both maps
    for (let [userId, id] of onlineUsers.entries()) {
      if (id === socket.id) {
        onlineUsers.delete(userId);
        userSocketMap.delete(userId); // Also remove from video call mapping
        console.log(` User ${userId} removed from socket map`);
        io.emit("updateUserStatus", { userId, status: "offline" });
        break;
      }
    }
    
    console.log(` Remaining online users: ${userSocketMap.size}`);
  });




  // --- PERSONAL CHAT ---
  socket.on('joinRoom', ({ senderId, receiverId }) => {
    const room = [senderId, receiverId].sort().join('_');
    socket.join(room);
    console.log(`User joined personal room: ${room}`);
  });

 




  // --- GROUP CHAT ---
 
  socket.on('sendMessage', (data) => {
  const room = [data.senderId, data.receiverId].sort().join('_');
  
  // Send message to room
  io.to(room).emit('receiveMessage', data);

  //  Notify both sender and receiver to move the other user to top
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

  // ============ JITSI VIDEO CALL EVENTS ============
  
  // Join user to their personal room for video calls
  socket.on('joinVideoRoom', (userData) => {
    socket.join(userData.userId);
    console.log(`User ${userData.userId} joined video room`);
  });

  // 1-on-1 Video Call Initiation
  socket.on('initiateVideoCall', (callData) => {
    console.log('Video call initiated:', callData);
    
    // If caller is not in socket map, try to add them
    if (!userSocketMap.has(callData.callerId)) {
      console.log(`  Auto-mapping caller ${callData.callerId} to socket ${socket.id}`);
      userSocketMap.set(callData.callerId, socket.id);
      onlineUsers.set(callData.callerId, socket.id);
    }
    
    // Debug: Show all mapped users
    console.log(' Current user socket mapping:', Array.from(userSocketMap.entries()));
    
    const receiverSocketId = getUserSocketId(callData.receiverId);
    console.log(` Looking for receiver ${callData.receiverId}`);
    console.log(` Found socket ID: ${receiverSocketId}`);
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('incomingVideoCall', {
        ...callData,
        callId: socket.id
      });
      console.log(` Video call invitation sent to ${callData.receiverName} (${callData.receiverId})`);
    } else {
      // Receiver is offline
      console.log(' Video call failed - receiver not found in socket map');
      console.log(' Make sure receiver called userOnline event');
      console.log(' Frontend should call: socket.emit("userOnline", userId) when user logs in');
      socket.emit('videoCallFailed', { 
        message: `${callData.receiverName} is currently offline`,
        receiverId: callData.receiverId 
      });
    }
  });

  // Video Call Acceptance
  socket.on('acceptVideoCall', (callData) => {
    console.log('Video call accepted:', callData);
    
    // Notify the caller
    const callerSocketId = getUserSocketId(callData.callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit('videoCallAccepted', callData);
      console.log(`Video call acceptance sent to caller ${callData.callerId}`);
    }
  });

  // Video Call Rejection
  socket.on('rejectVideoCall', (callData) => {
    console.log('Video call rejected:', callData);
    
    // Notify the caller
    const callerSocketId = getUserSocketId(callData.callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit('videoCallRejected', callData);
      console.log(`Video call rejection sent to caller ${callData.callerId}`);
    }
  });

  // End Video Call
  socket.on('endVideoCall', (callData) => {
    console.log('Video call ended:', callData);
    
    if (callData.isGroupCall) {
      // For group calls, notify all group members
      socket.to(callData.groupId).emit('videoCallEnded', callData);
      console.log(`Group video call ended notification sent to group ${callData.groupId}`);
    } else {
      // For 1-on-1 calls, notify both participants
      const callerSocketId = getUserSocketId(callData.callerId);
      const receiverSocketId = getUserSocketId(callData.receiverId);
      
      if (callerSocketId && callerSocketId !== socket.id) {
        io.to(callerSocketId).emit('videoCallEnded', callData);
      }
      if (receiverSocketId && receiverSocketId !== socket.id) {
        io.to(receiverSocketId).emit('videoCallEnded', callData);
      }
      console.log(`Video call ended notification sent to participants`);
    }
  });

  // Group Video Call Initiation
  socket.on('initiateGroupVideoCall', (callData) => {
    console.log('Group video call initiated:', callData);
    
    // If caller is not in socket map, try to add them
    if (!userSocketMap.has(callData.callerId)) {
      console.log(`  Auto-mapping caller ${callData.callerId} to socket ${socket.id}`);
      userSocketMap.set(callData.callerId, socket.id);
      onlineUsers.set(callData.callerId, socket.id);
    }
    
    // Debug: Show who's in the group room
    const groupRoom = io.sockets.adapter.rooms.get(callData.groupId);
    const membersInRoom = groupRoom ? Array.from(groupRoom) : [];
    console.log(` Group ${callData.groupId} has ${membersInRoom.length} connected members:`, membersInRoom);
    
    // Send invitation to all group members except caller
    socket.to(callData.groupId).emit('incomingVideoCall', {
      ...callData,
      callId: socket.id
    });
    
    console.log(` Group call invitation sent to ${membersInRoom.length - 1} members (excluding caller)`);
  });

  // Group Video Call Acceptance (when a group member joins)
  socket.on('joinGroupVideoCall', (callData) => {
    console.log('User joining group video call:', callData);
    
    // Notify other group members that someone joined
    socket.to(callData.groupId).emit('userJoinedGroupCall', {
      userId: callData.userId,
      userName: callData.userName,
      roomName: callData.roomName,
      groupId: callData.groupId
    });
  });

  // Video Call Status Updates (for busy, ringing, etc.)
  socket.on('videoCallStatus', (statusData) => {
    console.log('Video call status update:', statusData);
    
    if (statusData.targetUserId) {
      const targetSocketId = getUserSocketId(statusData.targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('videoCallStatusUpdate', statusData);
      }
    }
  });

  // ============ END VIDEO CALL EVENTS ============

 
  socket.on('joinGroup', (groupId) => {
    socket.join(groupId);
    console.log(`Socket ${socket.id} manually joined group ${groupId}`);
  });

  // Optional: When user leaves a group, remove them from the room
  socket.on('leaveGroup', (groupId) => {
    socket.leave(groupId);
    console.log(`Socket ${socket.id} left group ${groupId}`);
  });

  // Optional: When a new group is created, add all members to the room
  socket.on('groupCreated', async (groupData) => {
    const { groupId, memberIds } = groupData;
    console.log(`New group created: ${groupId}, adding ${memberIds.length} members`);
    
    // Add all online members to the new group room
    for (const memberId of memberIds) {
      const memberSocketId = getUserSocketId(memberId);
      if (memberSocketId) {
        const memberSocket = io.sockets.sockets.get(memberSocketId);
        if (memberSocket) {
          memberSocket.join(groupId);
          console.log(`Added user ${memberId} to new group ${groupId}`);
        }
      }
    }
  });

  // socket.on('sendGroupMessage', (data) => {
  //   io.to(data.groupId).emit('receiveGroupMessage', data);
  //   console.log(`Group message sent in ${data.groupId}:`, data);
  // });
  socket.on('sendGroupMessage', (data) => {
  io.to(data.groupId).emit('receiveGroupMessage', data);
  // Notify all group members to move the group to top and show notification
  io.to(data.groupId).emit('moveGroupToTop', { groupId: data.groupId });
  console.log(`Group message sent in ${data.groupId}:`, data);
});



  // Note: disconnect handler is already defined above with video call cleanup
});

 




const PORT = process.env.PORT || 5000;
server.listen(PORT,"0.0.0.0", () => console.log(`Server running on port ${PORT}`));

