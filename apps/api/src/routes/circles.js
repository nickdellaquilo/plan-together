const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('@plan-together/database');
const { authenticateToken } = require('../middleware/auth');

// Get user's circles (circles they created)
router.get('/my-circles', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*, 
       (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id) as member_count
       FROM circles c
       WHERE c.creator_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.userId]
    );

    res.json({ circles: result.rows });
  } catch (error) {
    console.error('Get circles error:', error);
    res.status(500).json({ error: 'Failed to fetch circles' });
  }
});

// Get circles the user is a member of (created by others)
router.get('/member-of', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*, u.id as creator_id, p.display_name as creator_name,
       (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id) as member_count
       FROM circles c
       JOIN circle_members cm ON c.id = cm.circle_id
       JOIN users u ON c.creator_id = u.id
       JOIN profiles p ON u.id = p.user_id
       WHERE cm.user_id = $1 AND c.creator_id != $1
       ORDER BY c.created_at DESC`,
      [req.user.userId]
    );

    res.json({ circles: result.rows });
  } catch (error) {
    console.error('Get member circles error:', error);
    res.status(500).json({ error: 'Failed to fetch circles' });
  }
});

// Create a circle
router.post('/',
  authenticateToken,
  [
    body('name').trim().notEmpty().withMessage('Circle name is required'),
    body('description').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;

    try {
      const result = await query(
        `INSERT INTO circles (creator_id, name, description)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [req.user.userId, name, description || null]
      );

      res.status(201).json({
        message: 'Circle created successfully',
        circle: result.rows[0]
      });
    } catch (error) {
      console.error('Create circle error:', error);
      res.status(500).json({ error: 'Failed to create circle' });
    }
  }
);

// Get circle details with members
router.get('/:circleId', authenticateToken, async (req, res) => {
  const { circleId } = req.params;

  try {
    // Get circle info
    const circleResult = await query(
      `SELECT c.*, u.id as creator_id, p.display_name as creator_name
       FROM circles c
       JOIN users u ON c.creator_id = u.id
       JOIN profiles p ON u.id = p.user_id
       WHERE c.id = $1`,
      [circleId]
    );

    if (circleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Circle not found' });
    }

    const circle = circleResult.rows[0];

    // Check if user has access (is creator or member)
    const accessCheck = await query(
      `SELECT 1 FROM circles WHERE id = $1 AND creator_id = $2
       UNION
       SELECT 1 FROM circle_members WHERE circle_id = $1 AND user_id = $2`,
      [circleId, req.user.userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get members
    const membersResult = await query(
      `SELECT u.id, p.first_name, p.last_name, p.display_name, 
       p.avatar_color, p.has_car, cm.added_at
       FROM circle_members cm
       JOIN users u ON cm.user_id = u.id
       JOIN profiles p ON u.id = p.user_id
       WHERE cm.circle_id = $1
       ORDER BY p.first_name, p.last_name`,
      [circleId]
    );

    res.json({
      circle,
      members: membersResult.rows,
      is_creator: circle.creator_id === req.user.userId
    });
  } catch (error) {
    console.error('Get circle details error:', error);
    res.status(500).json({ error: 'Failed to fetch circle details' });
  }
});

// Add friend to circle
router.post('/:circleId/members',
  authenticateToken,
  [body('userId').notEmpty().withMessage('User ID is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { circleId } = req.params;
    const { userId } = req.body;

    try {
      // Verify circle belongs to user
      const circleCheck = await query(
        'SELECT id FROM circles WHERE id = $1 AND creator_id = $2',
        [circleId, req.user.userId]
      );

      if (circleCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Only circle creator can add members' });
      }

      // Verify the user is a friend
      const friendCheck = await query(
        `SELECT 1 FROM friendships 
         WHERE user_id = $1 AND friend_id = $2 AND status = 'accepted'`,
        [req.user.userId, userId]
      );

      if (friendCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Can only add friends to circles' });
      }

      // Add to circle
      await query(
        'INSERT INTO circle_members (circle_id, user_id) VALUES ($1, $2)',
        [circleId, userId]
      );

      res.status(201).json({ message: 'Member added to circle' });
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'User already in this circle' });
      }
      console.error('Add member error:', error);
      res.status(500).json({ error: 'Failed to add member' });
    }
  }
);

// Remove member from circle
router.delete('/:circleId/members/:userId', authenticateToken, async (req, res) => {
  const { circleId, userId } = req.params;

  try {
    // Verify circle belongs to user
    const circleCheck = await query(
      'SELECT id FROM circles WHERE id = $1 AND creator_id = $2',
      [circleId, req.user.userId]
    );

    if (circleCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only circle creator can remove members' });
    }

    await query(
      'DELETE FROM circle_members WHERE circle_id = $1 AND user_id = $2',
      [circleId, userId]
    );

    res.json({ message: 'Member removed from circle' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Update circle
router.put('/:circleId',
  authenticateToken,
  [
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { circleId } = req.params;
    const { name, description } = req.body;

    try {
      // Verify ownership
      const circleCheck = await query(
        'SELECT id FROM circles WHERE id = $1 AND creator_id = $2',
        [circleId, req.user.userId]
      );

      if (circleCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Only circle creator can update' });
      }

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(name);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(description);
      }

      values.push(circleId);

      await query(
        `UPDATE circles SET ${updates.join(', ')} WHERE id = $${paramCount}`,
        values
      );

      res.json({ message: 'Circle updated successfully' });
    } catch (error) {
      console.error('Update circle error:', error);
      res.status(500).json({ error: 'Failed to update circle' });
    }
  }
);

// Delete circle
router.delete('/:circleId', authenticateToken, async (req, res) => {
  const { circleId } = req.params;

  try {
    const result = await query(
      'DELETE FROM circles WHERE id = $1 AND creator_id = $2',
      [circleId, req.user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(403).json({ error: 'Circle not found or access denied' });
    }

    res.json({ message: 'Circle deleted successfully' });
  } catch (error) {
    console.error('Delete circle error:', error);
    res.status(500).json({ error: 'Failed to delete circle' });
  }
});

module.exports = router;