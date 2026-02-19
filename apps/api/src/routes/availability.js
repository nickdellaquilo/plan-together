const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { query } = require('@plan-together/database');
const { authenticateToken } = require('../middleware/auth');

// Get user's availability (both recurring and specific dates)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM availability_slots 
       WHERE user_id = $1 
       ORDER BY 
         CASE WHEN day_of_week IS NOT NULL THEN day_of_week ELSE 7 END,
         specific_date,
         start_time`,
      [req.user.userId]
    );

    res.json({ slots: result.rows });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// Get specific user's availability (for viewing friends' schedules)
router.get('/user/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;

  try {
    // Verify they're friends
    const friendCheck = await query(
      `SELECT 1 FROM friendships 
       WHERE user_id = $1 AND friend_id = $2 AND status = 'accepted'`,
      [req.user.userId, userId]
    );

    if (friendCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Can only view friends availability' });
    }

    const result = await query(
      `SELECT * FROM availability_slots 
       WHERE user_id = $1 
       ORDER BY 
         CASE WHEN day_of_week IS NOT NULL THEN day_of_week ELSE 7 END,
         specific_date,
         start_time`,
      [userId]
    );

    res.json({ slots: result.rows });
  } catch (error) {
    console.error('Get user availability error:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// Create availability slot
router.post('/',
  authenticateToken,
  [
    body('dayOfWeek').optional().isInt({ min: 0, max: 6 }),
    body('specificDate').optional().isISO8601().toDate(),
    body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('status').isIn(['free', 'busy', 'maybe']),
    body('notes').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { dayOfWeek, specificDate, startTime, endTime, status, notes } = req.body;

    // Validate that exactly one of dayOfWeek or specificDate is provided
    if ((dayOfWeek !== undefined && specificDate !== undefined) ||
        (dayOfWeek === undefined && specificDate === undefined)) {
      return res.status(400).json({ 
        error: 'Must provide either dayOfWeek (for recurring) or specificDate (for one-time)' 
      });
    }

    try {
      const result = await query(
        `INSERT INTO availability_slots 
         (user_id, day_of_week, specific_date, start_time, end_time, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          req.user.userId,
          dayOfWeek !== undefined ? dayOfWeek : null,
          specificDate || null,
          startTime,
          endTime,
          status,
          notes || null
        ]
      );

      res.status(201).json({
        message: 'Availability slot created',
        slot: result.rows[0]
      });
    } catch (error) {
      console.error('Create availability error:', error);
      res.status(500).json({ error: 'Failed to create availability slot' });
    }
  }
);

// Update availability slot
router.put('/:slotId',
  authenticateToken,
  [
    body('startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('status').optional().isIn(['free', 'busy', 'maybe']),
    body('notes').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { slotId } = req.params;
    const { startTime, endTime, status, notes } = req.body;

    try {
      // Verify ownership
      const slotCheck = await query(
        'SELECT id FROM availability_slots WHERE id = $1 AND user_id = $2',
        [slotId, req.user.userId]
      );

      if (slotCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Slot not found or access denied' });
      }

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (startTime !== undefined) {
        updates.push(`start_time = $${paramCount++}`);
        values.push(startTime);
      }
      if (endTime !== undefined) {
        updates.push(`end_time = $${paramCount++}`);
        values.push(endTime);
      }
      if (status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(status);
      }
      if (notes !== undefined) {
        updates.push(`notes = $${paramCount++}`);
        values.push(notes);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      values.push(slotId);

      await query(
        `UPDATE availability_slots SET ${updates.join(', ')} WHERE id = $${paramCount}`,
        values
      );

      res.json({ message: 'Availability slot updated' });
    } catch (error) {
      console.error('Update availability error:', error);
      res.status(500).json({ error: 'Failed to update availability slot' });
    }
  }
);

// Delete availability slot
router.delete('/:slotId', authenticateToken, async (req, res) => {
  const { slotId } = req.params;

  try {
    const result = await query(
      'DELETE FROM availability_slots WHERE id = $1 AND user_id = $2',
      [slotId, req.user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Slot not found or access denied' });
    }

    res.json({ message: 'Availability slot deleted' });
  } catch (error) {
    console.error('Delete availability error:', error);
    res.status(500).json({ error: 'Failed to delete availability slot' });
  }
});

// Get common free time for multiple users
router.post('/common-free-time',
  authenticateToken,
  [
    body('userIds').isArray({ min: 1 }),
    body('startDate').isISO8601().toDate(),
    body('endDate').isISO8601().toDate(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userIds, startDate, endDate } = req.body;

    try {
      // Add requesting user to the list
      const allUserIds = [...new Set([req.user.userId, ...userIds])];

      // Get all users' availability in the date range
      const result = await query(
        `SELECT user_id, day_of_week, specific_date, start_time, end_time, status
         FROM availability_slots
         WHERE user_id = ANY($1::uuid[])
         AND (
           specific_date BETWEEN $2 AND $3
           OR day_of_week IS NOT NULL
         )
         AND status = 'free'
         ORDER BY user_id, specific_date, day_of_week, start_time`,
        [allUserIds, startDate, endDate]
      );

      // Group by user
      const userAvailability = {};
      allUserIds.forEach(id => {
        userAvailability[id] = result.rows.filter(row => row.user_id === id);
      });

      res.json({
        userAvailability,
        userIds: allUserIds
      });
    } catch (error) {
      console.error('Get common free time error:', error);
      res.status(500).json({ error: 'Failed to find common free time' });
    }
  }
);

module.exports = router;