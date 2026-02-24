const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { query } = require('@plan-together/database');
const { authenticateToken } = require('../middleware/auth');

// Helper function to check if a recurring slot applies to a specific date
function slotMatchesDate(slot, targetDate) {
  const target = new Date(targetDate);
  const startDate = new Date(slot.recurrence_start_date);
  const endDate = slot.recurrence_end_date ? new Date(slot.recurrence_end_date) : null;

  // Check if target is within range
  if (target < startDate) return false;
  if (endDate && target > endDate) return false;

  switch (slot.recurrence_type) {
    case 'once':
      return slot.recurrence_start_date === targetDate.split('T')[0];
    
    case 'daily': {
      const daysDiff = Math.floor((target - startDate) / (1000 * 60 * 60 * 24));
      return daysDiff >= 0 && daysDiff % slot.recurrence_interval === 0;
    }
    
    case 'weekly': {
      if (target.getDay() !== slot.day_of_week) return false;
      const weeksDiff = Math.floor((target - startDate) / (1000 * 60 * 60 * 24 * 7));
      return weeksDiff >= 0 && weeksDiff % slot.recurrence_interval === 0;
    }
    
    case 'monthly': {
      const monthsDiff = (target.getFullYear() - startDate.getFullYear()) * 12 
                        + (target.getMonth() - startDate.getMonth());
      return monthsDiff >= 0 
        && monthsDiff % slot.recurrence_interval === 0
        && target.getDate() === startDate.getDate();
    }
    
    case 'yearly': {
      const yearsDiff = target.getFullYear() - startDate.getFullYear();
      return yearsDiff >= 0 
        && yearsDiff % slot.recurrence_interval === 0
        && target.getMonth() === startDate.getMonth()
        && target.getDate() === startDate.getDate();
    }
    
    default:
      return false;
  }
}

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
    body('recurrenceType').isIn(['once', 'daily', 'weekly', 'monthly', 'yearly']),
    body('recurrenceInterval').isInt({ min: 1 }).withMessage('Interval must be at least 1'),
    body('recurrenceStartDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Start date required (YYYY-MM-DD)'),
    body('recurrenceEndDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
    body('dayOfWeek').optional().isInt({ min: 0, max: 6 }),
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

    const { 
      recurrenceType, 
      recurrenceInterval, 
      recurrenceStartDate, 
      recurrenceEndDate,
      dayOfWeek,
      startTime, 
      endTime, 
      status, 
      notes 
    } = req.body;

    try {
      // For backwards compatibility, also set old fields
      const specificDate = recurrenceType === 'once' ? recurrenceStartDate : null;
      const dayOfWeekValue = recurrenceType === 'weekly' ? dayOfWeek : null;

      const result = await query(
        `INSERT INTO availability_slots 
         (user_id, recurrence_type, recurrence_interval, recurrence_start_date, 
          recurrence_end_date, day_of_week, specific_date, start_time, end_time, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          req.user.userId,
          recurrenceType,
          recurrenceInterval,
          recurrenceStartDate,
          recurrenceEndDate || null,
          dayOfWeekValue,
          specificDate,
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
    body('notes').optional(),
    body('recurrenceInterval').optional().isInt({ min: 1 }),
    body('recurrenceEndDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { slotId } = req.params;
    const { startTime, endTime, status, notes, recurrenceInterval, recurrenceEndDate } = req.body;

    try {
      // Verify ownership
      const slotCheck = await query(
        'SELECT * FROM availability_slots WHERE id = $1 AND user_id = $2',
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
        values.push(notes === '' ? null : notes);
      }
      if (recurrenceInterval !== undefined) {
        updates.push(`recurrence_interval = $${paramCount++}`);
        values.push(recurrenceInterval);
      }
      if (recurrenceEndDate !== undefined) {
        updates.push(`recurrence_end_date = $${paramCount++}`);
        values.push(recurrenceEndDate || null);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      values.push(slotId);

      const result = await query(
        `UPDATE availability_slots SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      res.json({ 
        message: 'Availability slot updated',
        slot: result.rows[0]
      });
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

// Get availability for a date range (for calendar views)
router.get('/range', authenticateToken, async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate required' });
  }

  try {
    // Get all user's slots that could possibly match
    const result = await query(
      `SELECT * FROM availability_slots 
       WHERE user_id = $1 
       AND (
         recurrence_end_date IS NULL 
         OR recurrence_end_date >= $2
       )
       AND recurrence_start_date <= $3
       ORDER BY start_time`,
      [req.user.userId, startDate, endDate]
    );

    // Filter slots by date matching logic
    const slots = result.rows;
    const matchedSlots = {};

    // Generate all dates in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      matchedSlots[dateStr] = slots.filter(slot => 
        slotMatchesDate(slot, d.toISOString())
      );
    }

    res.json({ slots: matchedSlots });
  } catch (error) {
    console.error('Get date range error:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

module.exports = router;