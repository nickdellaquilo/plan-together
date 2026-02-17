const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { query } = require('@plan-together/database');
const { authenticateToken } = require('../middleware/auth');

// Get user's friends list
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        f.id as friendship_id, f.status, f.created_at,
        u.id as user_id, p.first_name, p.last_name, 
        p.display_name, p.avatar_color, p.has_car
      FROM friendships f
      JOIN users u ON f.friend_id = u.id
      JOIN profiles p ON u.id = p.user_id
      WHERE f.user_id = $1 AND f.status = 'accepted'
      ORDER BY p.first_name, p.last_name`,
      [req.user.userId]
    );

    res.json({ friends: result.rows });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// Get pending friend requests (received)
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        f.id as friendship_id, f.created_at,
        u.id as user_id, p.first_name, p.last_name, 
        p.display_name, p.avatar_color
      FROM friendships f
      JOIN users u ON f.user_id = u.id
      JOIN profiles p ON u.id = p.user_id
      WHERE f.friend_id = $1 AND f.status = 'pending'
      ORDER BY f.created_at DESC`,
      [req.user.userId]
    );

    res.json({ requests: result.rows });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ error: 'Failed to fetch friend requests' });
  }
});

// Send friend request by user ID
router.post('/request',
  authenticateToken,
  [body('friendId').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { friendId } = req.body;

    if (friendId === req.user.userId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    try {
      // Check if friend exists
      const friendExists = await query(
        'SELECT id FROM users WHERE id = $1',
        [friendId]
      );

      if (friendExists.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if friendship already exists
      const existingFriendship = await query(
        `SELECT id, status FROM friendships 
         WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
        [req.user.userId, friendId]
      );

      if (existingFriendship.rows.length > 0) {
        const status = existingFriendship.rows[0].status;
        if (status === 'accepted') {
          return res.status(409).json({ error: 'Already friends' });
        } else if (status === 'pending') {
          return res.status(409).json({ error: 'Friend request already sent' });
        }
      }

      // Create friend request
      await query(
        'INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, $3)',
        [req.user.userId, friendId, 'pending']
      );

      res.status(201).json({ message: 'Friend request sent' });
    } catch (error) {
      console.error('Send friend request error:', error);
      res.status(500).json({ error: 'Failed to send friend request' });
    }
  }
);

// Accept friend request
router.post('/accept/:friendshipId', authenticateToken, async (req, res) => {
  const { friendshipId } = req.params;

  try {
    // Verify the request is for this user and is pending
    const friendship = await query(
      'SELECT user_id, friend_id FROM friendships WHERE id = $1 AND friend_id = $2 AND status = $3',
      [friendshipId, req.user.userId, 'pending']
    );

    if (friendship.rows.length === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Update the request to accepted
    await query(
      'UPDATE friendships SET status = $1 WHERE id = $2',
      ['accepted', friendshipId]
    );

    // Create reciprocal friendship
    const { user_id, friend_id } = friendship.rows[0];
    await query(
      'INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, $3)',
      [friend_id, user_id, 'accepted']
    );

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// Reject friend request
router.delete('/reject/:friendshipId', authenticateToken, async (req, res) => {
  const { friendshipId } = req.params;

  try {
    const result = await query(
      'DELETE FROM friendships WHERE id = $1 AND friend_id = $2 AND status = $3',
      [friendshipId, req.user.userId, 'pending']
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(500).json({ error: 'Failed to reject friend request' });
  }
});

// Find users by phone number
router.post('/find-by-phone',
  authenticateToken,
  [body('phoneNumber').isMobilePhone()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phoneNumber } = req.body;

    try {
      const result = await query(
        `SELECT 
          u.id, p.first_name, p.last_name, p.display_name, p.avatar_color
        FROM users u
        JOIN profiles p ON u.id = p.user_id
        WHERE u.phone_number = $1 AND u.id != $2`,
        [phoneNumber, req.user.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'No user found with this phone number' });
      }

      // Check if already friends
      const friendshipCheck = await query(
        `SELECT status FROM friendships 
         WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
        [req.user.userId, result.rows[0].id]
      );

      const user = result.rows[0];
      user.friendship_status = friendshipCheck.rows.length > 0 
        ? friendshipCheck.rows[0].status 
        : null;

      res.json({ user });
    } catch (error) {
      console.error('Find by phone error:', error);
      res.status(500).json({ error: 'Failed to search for user' });
    }
  }
);

// Search users by name or email
router.get('/search', authenticateToken, async (req, res) => {
  const { query: searchQuery } = req.query;

  if (!searchQuery || searchQuery.trim().length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }

  try {
    const result = await query(
      `SELECT 
        u.id, p.first_name, p.last_name, p.display_name, 
        p.avatar_color, u.email
      FROM users u
      JOIN profiles p ON u.id = p.user_id
      WHERE (
        LOWER(p.first_name) LIKE LOWER($1) OR
        LOWER(p.last_name) LIKE LOWER($1) OR
        LOWER(p.display_name) LIKE LOWER($1) OR
        LOWER(u.email) LIKE LOWER($1)
      ) AND u.id != $2
      LIMIT 20`,
      [`%${searchQuery}%`, req.user.userId]
    );

    // Check friendship status for each result
    for (let user of result.rows) {
      const friendshipCheck = await query(
        `SELECT status FROM friendships 
         WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
        [req.user.userId, user.id]
      );

      user.friendship_status = friendshipCheck.rows.length > 0 
        ? friendshipCheck.rows[0].status 
        : null;
    }

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Remove friend
router.delete('/:friendId', authenticateToken, async (req, res) => {
  const { friendId } = req.params;

  try {
    // Delete both directions of the friendship
    await query(
      `DELETE FROM friendships 
       WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [req.user.userId, friendId]
    );

    res.json({ message: 'Friend removed' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

module.exports = router;