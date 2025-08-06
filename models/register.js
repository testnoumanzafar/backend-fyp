const mongoose = require("mongoose");

const NewUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    picture: { url: String, public_id: String },
    status: { type: String, default: "offline" }, //  Not from user input
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NewUser", NewUserSchema);
