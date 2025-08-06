const express = require("express");
 
const Message = require("../models/message.js");

const MessageCome = async (req, res) => {
  try {
    const { senderId, receiverId, content } = req.body;
    let fileUrl = null;
    let voiceUrl = null;

    if (req.files?.file) {
      fileUrl = req.files.file[0].location;
    }

    if (req.files?.voice) {
      voiceUrl = req.files.voice[0].location;
    }

    const message = await Message.create({
      senderId,
      receiverId,
      content,
      file: fileUrl,
      voice: voiceUrl,
    });

    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
};






 




const MessageSend = async (req, res) => {
  const { senderId, receiverId } = req.query;
  console.log(req.query);
  
  try {
    const messages = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ]
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get messages' });
  }
}


module.exports = { MessageCome, MessageSend };