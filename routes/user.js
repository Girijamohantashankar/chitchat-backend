const express = require('express');
const User = require('../models/User'); 
const authMiddleware = require('../middleware/auth'); 
const router = express.Router();



router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }
    const hiddenUserIds = currentUser.userNotVisible || [];
    const users = await User.find({
      _id: { 
        $ne: userId, 
        $nin: hiddenUserIds 
      }
    });

    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: 'Error fetching users' });
  }
});



// Get the current user's details
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching user details' });
  }
});

// Update user details with profile picture
router.put('/:id', authMiddleware, async (req, res) => {
  const { name, profilePic } = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { name, profilePic },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: 'Error updating user details' });
  }
});

  

module.exports = router;
