const express = require("express");
const router = express.Router();
const Message = require("../models/Message"); // Make sure you have a Message model defined
const User = require("../models/User"); // Make sure you have a User model defined
const authMiddleware = require("../middleware/auth");

// Send message (protected route)
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { receiverId, text, fileURL, attachmentNote } = req.body;
    const senderId = req.userId;

    // Validate that at least text or fileURL is provided
    if (!text && !fileURL) {
      return res.status(400).json({ error: 'Message must contain text or a file URL' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    const message = new Message({
      senderId,
      receiverId,
      text: text || null, // Assign null if text is empty
      fileURL: fileURL || null,
      attachmentNote: attachmentNote || null,
      timestamp: new Date(),
    });

    await message.save();

    req.io.to(receiverId).emit("receiveMessage", {
      senderId,
      receiverId,
      text: message.text, // Use the message text, which is either provided or null
      fileURL: message.fileURL,
      attachmentNote,
      timestamp: message.timestamp,
      _id: message._id,
    });

    res.status(200).json(message);
  } catch (error) {
    console.error("Error in /send route:", error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});


// Get messages between two users (protected route)
router.get('/messages/:friendId', authMiddleware, async (req, res) => {
  const { friendId } = req.params;
  const userId = req.userId;

  try {
    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({ error: 'Friend not found' });
    }

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: friendId },
        { senderId: friendId, receiverId: userId }
      ]
    }).sort('timestamp');

    res.status(200).json(messages);
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
});

// Delete message (protected route)
router.delete('/delete/:id', authMiddleware, async (req, res) => {
  const messageId = req.params.id;

  try {
    await Message.findByIdAndDelete(messageId); 
    res.status(200).send({ message: "Message deleted successfully" });
  } catch (error) {
    res.status(500).send({ error: "Failed to delete message" });
  }
});


module.exports = router;
