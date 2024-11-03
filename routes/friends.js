const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const User = require("../models/User");
const Message = require("../models/Message");
const authMiddleware = require("../middleware/auth");

//Sending a friend request
router.post("/send-request/:id", authMiddleware, async (req, res) => {
  try {
    const receiveRequest = req.params.id; 
    const sendRequest = req.userId; 

    const user = await User.findById(sendRequest);
    if (!user) return res.status(404).json({ msg: "User not found" });
    const existingRequest = user.friends.find(
      (friend) => friend.receiveRequest.toString() === receiveRequest
    );
    if (existingRequest) {
      return res.status(400).json({ msg: "Friend request already sent." });
    }
    user.friends.push({ receiveRequest, status: "pending", sendRequest });
    await user.save();
    const receiver = await User.findById(receiveRequest);
    if (receiver) {
      receiver.friends.push({
        receiveRequest: sendRequest,
        status: "pending",
        sendRequest,
      });
      await receiver.save();
      if (!receiver.userNotVisible.includes(sendRequest)) {
        receiver.userNotVisible.push(sendRequest);
        await receiver.save(); 
      }
    }

    res.status(200).json({ msg: "Friend request sent successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

//Updating  friend request
router.put("/update-request/:id", authMiddleware, async (req, res) => {
  try {
    const receiveRequest = req.params.id;
    const sendRequest = req.userId;
    const { status } = req.body;

    const user = await User.findById(sendRequest);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const friendRequest = user.friends.find(
      (friend) =>
        friend.receiveRequest.toString() === receiveRequest &&
        friend.sendRequest.toString() !== sendRequest
    );
    if (!friendRequest) {
      return res.status(404).json({ msg: "Friend request not found." });
    }

    friendRequest.status = status;
    await user.save();

    const sender = await User.findById(friendRequest.sendRequest);
    if (sender) {
      const senderFriendRequest = sender.friends.find(
        (friend) => friend.receiveRequest.toString() === sendRequest
      );
      if (senderFriendRequest) {
        senderFriendRequest.status =
          status === "accepted" ? "accepted" : "rejected";
        await sender.save();
      }
    }

    res.status(200).json({ msg: `Friend request ${status} successfully.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

router.get("/requests", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId)
      .populate("friends.receiveRequest", "name profilePic")
      .populate("friends.sendRequest", "name profilePic");

    if (!user) return res.status(404).json({ msg: "User not found" });
    const requests = user.friends
      .filter((friend) => friend.status === "pending")
      .map((friend) => ({
        friendId: friend.receiveRequest._id.toString(),
        friendName: friend.receiveRequest.name,
        profilePic: friend.receiveRequest.profilePic,
        status: friend.status,
      }));

    res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching friend requests:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Fetch users with accepted friend requests
router.get("/accepted-requests", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId; 
    console.log(`Fetching accepted requests for user ID: ${userId}`);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });
    const acceptedFriends = user.friends.filter(
      (friend) => friend.status === "accepted"
    );
    const acceptedFriendsDetails = await Promise.all(
      acceptedFriends.map(async (friend) => {
        const friendUser = await User.findById(friend.receiveRequest);
        return {
          friendId: friendUser._id.toString(),
          friendName: friendUser.name,
          profilePic: friendUser.profilePic,
        };
      })
    );

    res.status(200).json(acceptedFriendsDetails);
  } catch (error) {
    console.error(`Error fetching accepted requests:`, error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Fetch last message with each accepted friend
router.get("/last-messages", authMiddleware, async (req, res) => {
  try {
      const userId = req.userId;
      console.log(`Fetching last messages for user ID: ${userId}`);

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ msg: "User not found" });

      const acceptedFriends = user.friends.filter(friend => friend.status === "accepted");

      const lastMessages = await Promise.all(
          acceptedFriends.map(async (friend) => {
              const friendUserId = friend.receiveRequest;
              const lastMessage = await Message.findOne({
                  $or: [
                      { senderId: userId, receiverId: friendUserId },
                      { senderId: friendUserId, receiverId: userId },
                  ],
              }).sort({ timestamp: -1 });

              return {
                  friendId: friendUserId,
                  lastMessage: lastMessage ? lastMessage.text : "No messages yet",
                  timestamp: lastMessage ? lastMessage.timestamp : null, 
              };
          })
      );

      res.status(200).json(lastMessages);
  } catch (error) {
      console.error("Error fetching last messages:", error);
      res.status(500).json({ msg: "Server error" });
  }
});




module.exports = router;
