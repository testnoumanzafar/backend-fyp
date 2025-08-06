const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  picture: { type: String }, // URL from S3
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'NewUser', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'NewUser' }],
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);
