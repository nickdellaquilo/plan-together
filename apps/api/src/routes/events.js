const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('@plan-together/database');
const { authenticateToken } = require('../middleware/auth');

// Get user's events (created, invited to, or visible via circles)
router.get('/', authenticateToken, async (req, res) => {
  const { status, upcoming } = req.query;

  try {
    let queryText = `
      SELECT DISTINCT e.*, 
        u.id as creator_id, 
        p.display_name as creator_name,
        p.avatar_color as creator_avatar,
        ei.rsvp_status as my_rsvp,
        (SELECT COUNT(*) + 1 FROM event_invites WHERE event_id = e.id AND rsvp_status = 'going') as going_count,
        (SELECT COUNT(*) FROM event_invites WHERE event_id = e.id AND rsvp_status = 'maybe') as maybe_count,
        (SELECT COUNT(*) FROM event_invites WHERE event_id = e.id AND rsvp_status = 'declined') as declined_count,
        (SELECT COUNT(*) FROM event_invites WHERE event_id = e.id) as total_invited,
        CASE 
          WHEN e.creator_id = $1 THEN true
          ELSE false
        END as is_creator
      FROM events e
      JOIN users u ON e.creator_id = u.id
      JOIN profiles p ON u.id = p.user_id
      LEFT JOIN event_invites ei ON e.id = ei.event_id AND ei.user_id = $1
      WHERE (
        e.creator_id = $1 
        OR ei.user_id = $1
        OR EXISTS (
          SELECT 1 FROM event_circles ec
          JOIN circle_members cm ON ec.circle_id = cm.circle_id
          WHERE ec.event_id = e.id AND cm.user_id = $1
        )
      )
    `;

    const params = [req.user.userId];

    if (status) {
      queryText += ` AND e.status = $${params.length + 1}`;
      params.push(status);
    }

    if (upcoming === 'true') {
      queryText += ` AND e.event_date >= CURRENT_DATE`;
    } else if (upcoming === 'false') {
      queryText += ` AND e.event_date < CURRENT_DATE`;
    }

    queryText += ' ORDER BY e.event_date, e.start_time';

    const result = await query(queryText, params);

    res.json({ events: result.rows });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get single event details
router.get('/:eventId', authenticateToken, async (req, res) => {
  const { eventId } = req.params;

  try {
    // Get event
    const eventResult = await query(
      `SELECT e.*, 
        u.id as creator_id, 
        p.display_name as creator_name,
        p.avatar_color as creator_avatar
      FROM events e
      JOIN users u ON e.creator_id = u.id
      JOIN profiles p ON u.id = p.user_id
      WHERE e.id = $1`,
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];

    // Check if user has access (creator, invited, or circle member)
    const accessCheck = await query(
      `SELECT 1 FROM events WHERE id = $1 AND creator_id = $2
       UNION
       SELECT 1 FROM event_invites WHERE event_id = $1 AND user_id = $2
       UNION
       SELECT 1 FROM event_circles ec
       JOIN circle_members cm ON ec.circle_id = cm.circle_id
       WHERE ec.event_id = $1 AND cm.user_id = $2`,
      [eventId, req.user.userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get invites with user details
    const invitesResult = await query(
      `SELECT ei.*, 
        u.id as user_id, 
        p.first_name, 
        p.last_name, 
        p.display_name,
        p.avatar_color
      FROM event_invites ei
      JOIN users u ON ei.user_id = u.id
      JOIN profiles p ON u.id = p.user_id
      WHERE ei.event_id = $1
      ORDER BY ei.invited_at`,
      [eventId]
    );

    // Get circles this event is shared with
    const circlesResult = await query(
      `SELECT c.id, c.name, c.description
       FROM event_circles ec
       JOIN circles c ON ec.circle_id = c.id
       WHERE ec.event_id = $1`,
      [eventId]
    );

    res.json({
      event,
      invites: invitesResult.rows,
      circles: circlesResult.rows,
      is_creator: event.creator_id === req.user.userId
    });
  } catch (error) {
    console.error('Get event details error:', error);
    res.status(500).json({ error: 'Failed to fetch event details' });
  }
});

// Create event
router.post('/',
  authenticateToken,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').optional().trim(),
    body('eventDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Valid date required (YYYY-MM-DD)'),
    body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('locationName').optional().trim(),
    body('inviteUserIds').optional().isArray(),
    body('inviteCircleIds').optional().isArray(),
    body('visibleToCircleIds').optional().isArray(),  // NEW: Circles that can see this event
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      eventDate,
      startTime,
      endTime,
      locationName,
      inviteUserIds = [],
      inviteCircleIds = [],
      visibleToCircleIds = []  // NEW
    } = req.body;

    try {
      await transaction(async (client) => {
        // Create event
        const eventResult = await client.query(
          `INSERT INTO events 
           (creator_id, title, description, event_date, start_time, end_time, location_name, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [req.user.userId, title, description || null, eventDate, startTime, endTime, locationName || null, 'planned']
        );

        const event = eventResult.rows[0];

        // Link event to circles for visibility
        if (visibleToCircleIds.length > 0) {
          // Verify user owns these circles
          const circleCheck = await client.query(
            `SELECT id FROM circles 
             WHERE id = ANY($1::uuid[]) AND creator_id = $2`,
            [visibleToCircleIds, req.user.userId]
          );

          const validCircleIds = circleCheck.rows.map(r => r.id);
          
          for (const circleId of validCircleIds) {
            await client.query(
              'INSERT INTO event_circles (event_id, circle_id) VALUES ($1, $2)',
              [event.id, circleId]
            );
          }
        }

        // Collect all user IDs to invite
        const userIdsToInvite = new Set(inviteUserIds);

        // Add users from circles
        if (inviteCircleIds.length > 0) {
          const circleMembers = await client.query(
            `SELECT user_id FROM circle_members 
             WHERE circle_id = ANY($1::uuid[])
             AND circle_id IN (SELECT id FROM circles WHERE creator_id = $2)`,
            [inviteCircleIds, req.user.userId]
          );
          circleMembers.rows.forEach(row => userIdsToInvite.add(row.user_id));
        }

        // Remove creator from invites
        userIdsToInvite.delete(req.user.userId);

        // Verify all users are friends OR in same circles
        if (userIdsToInvite.size > 0) {
          const accessCheck = await client.query(
            `SELECT DISTINCT friend_id as user_id FROM friendships 
             WHERE user_id = $1 AND friend_id = ANY($2::uuid[]) AND status = 'accepted'
             UNION
             SELECT DISTINCT cm2.user_id FROM circle_members cm1
             JOIN circle_members cm2 ON cm1.circle_id = cm2.circle_id
             WHERE cm1.user_id = $1 AND cm2.user_id = ANY($2::uuid[])`,
            [req.user.userId, Array.from(userIdsToInvite)]
          );

          const validUserIds = new Set(accessCheck.rows.map(r => r.user_id));
          
          // Only invite valid users
          for (const userId of userIdsToInvite) {
            if (validUserIds.has(userId)) {
              await client.query(
                'INSERT INTO event_invites (event_id, user_id, rsvp_status) VALUES ($1, $2, $3)',
                [event.id, userId, 'pending']
              );
            }
          }
        }

        res.status(201).json({
          message: 'Event created successfully',
          event,
          invited_count: userIdsToInvite.size,
          visible_to_circles: visibleToCircleIds.length
        });
      });
    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({ error: 'Failed to create event' });
    }
  }
);

// Update event
router.put('/:eventId',
  authenticateToken,
  [
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('eventDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
    body('startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('locationName').optional().trim(),
    body('status').optional().isIn(['planned', 'confirmed', 'cancelled']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventId } = req.params;
    const { title, description, eventDate, startTime, endTime, locationName, status } = req.body;

    try {
      // Verify ownership
      const eventCheck = await query(
        'SELECT id FROM events WHERE id = $1 AND creator_id = $2',
        [eventId, req.user.userId]
      );

      if (eventCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Only event creator can update' });
      }

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (title !== undefined) {
        updates.push(`title = $${paramCount++}`);
        values.push(title);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(description);
      }
      if (eventDate !== undefined) {
        updates.push(`event_date = $${paramCount++}`);
        values.push(eventDate);
      }
      if (startTime !== undefined) {
        updates.push(`start_time = $${paramCount++}`);
        values.push(startTime);
      }
      if (endTime !== undefined) {
        updates.push(`end_time = $${paramCount++}`);
        values.push(endTime);
      }
      if (locationName !== undefined) {
        updates.push(`location_name = $${paramCount++}`);
        values.push(locationName);
      }
      if (status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(status);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      values.push(eventId);

      await query(
        `UPDATE events SET ${updates.join(', ')} WHERE id = $${paramCount}`,
        values
      );

      res.json({ message: 'Event updated successfully' });
    } catch (error) {
      console.error('Update event error:', error);
      res.status(500).json({ error: 'Failed to update event' });
    }
  }
);

// Update event circle visibility
router.put('/:eventId/circles',
  authenticateToken,
  [body('circleIds').isArray()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventId } = req.params;
    const { circleIds } = req.body;

    try {
      await transaction(async (client) => {
        // Verify ownership
        const eventCheck = await client.query(
          'SELECT id FROM events WHERE id = $1 AND creator_id = $2',
          [eventId, req.user.userId]
        );

        if (eventCheck.rows.length === 0) {
          throw new Error('Only event creator can update visibility');
        }

        // Verify user owns these circles
        const circleCheck = await client.query(
          `SELECT id FROM circles 
           WHERE id = ANY($1::uuid[]) AND creator_id = $2`,
          [circleIds, req.user.userId]
        );

        const validCircleIds = circleCheck.rows.map(r => r.id);

        // Remove existing circles
        await client.query(
          'DELETE FROM event_circles WHERE event_id = $1',
          [eventId]
        );

        // Add new circles
        for (const circleId of validCircleIds) {
          await client.query(
            'INSERT INTO event_circles (event_id, circle_id) VALUES ($1, $2)',
            [eventId, circleId]
          );
        }

        res.json({ 
          message: 'Event visibility updated',
          circle_count: validCircleIds.length
        });
      });
    } catch (error) {
      console.error('Update event circles error:', error);
      res.status(500).json({ error: error.message || 'Failed to update event visibility' });
    }
  }
);

// Delete/cancel event
router.delete('/:eventId', authenticateToken, async (req, res) => {
  const { eventId } = req.params;

  try {
    const result = await query(
      'DELETE FROM events WHERE id = $1 AND creator_id = $2',
      [eventId, req.user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(403).json({ error: 'Event not found or access denied' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Invite additional users to event
router.post('/:eventId/invite',
  authenticateToken,
  [body('userIds').isArray({ min: 1 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventId } = req.params;
    const { userIds } = req.body;

    try {
      // Verify ownership
      const eventCheck = await query(
        'SELECT id FROM events WHERE id = $1 AND creator_id = $2',
        [eventId, req.user.userId]
      );

      if (eventCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Only event creator can invite' });
      }

      // Verify users are friends
      const friendCheck = await query(
        `SELECT friend_id FROM friendships 
         WHERE user_id = $1 AND friend_id = ANY($2::uuid[]) AND status = 'accepted'`,
        [req.user.userId, userIds]
      );

      const validFriendIds = friendCheck.rows.map(r => r.friend_id);
      let invitedCount = 0;

      for (const userId of validFriendIds) {
        try {
          await query(
            'INSERT INTO event_invites (event_id, user_id, rsvp_status) VALUES ($1, $2, $3)',
            [eventId, userId, 'pending']
          );
          invitedCount++;
        } catch (err) {
          // Ignore duplicate invites
          if (err.code !== '23505') throw err;
        }
      }

      res.json({ 
        message: `Invited ${invitedCount} user(s)`,
        invited_count: invitedCount
      });
    } catch (error) {
      console.error('Invite users error:', error);
      res.status(500).json({ error: 'Failed to invite users' });
    }
  }
);

// RSVP to event
router.put('/:eventId/rsvp',
  authenticateToken,
  [body('status').isIn(['going', 'maybe', 'declined'])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventId } = req.params;
    const { status } = req.body;

    try {
      const result = await query(
        `UPDATE event_invites 
         SET rsvp_status = $1, responded_at = CURRENT_TIMESTAMP
         WHERE event_id = $2 AND user_id = $3
         RETURNING *`,
        [status, eventId, req.user.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Invite not found' });
      }

      res.json({ 
        message: 'RSVP updated',
        rsvp: result.rows[0]
      });
    } catch (error) {
      console.error('RSVP error:', error);
      res.status(500).json({ error: 'Failed to update RSVP' });
    }
  }
);

module.exports = router;