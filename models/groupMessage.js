const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'NewUser', required: true },
  text: { type: String },
  fileUrl: { type: String },
  voiceUrl: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('GroupMessage', groupMessageSchema);
