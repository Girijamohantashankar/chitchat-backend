const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  text: {
    type: String,
    required: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  fileURL: {
    type: String, 
    default: null,
  },
  attachmentNote: {
    type: String,
    default: null,
  },
});

module.exports = mongoose.model("Message", messageSchema);
