const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { query } = require('@plan-together/database');
const { authenticateToken } = require('../middleware/auth');

// Get current user's profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        u.id, u.email, u.phone_number,
        p.first_name, p.last_name, p.display_name,
        p.location_name, p.location_lat, p.location_lng,
        p.has_car, p.car_seats, p.car_mpg, p.avatar_color
      FROM users u
      JOIN profiles p ON u.id = p.user_id
      WHERE u.id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ profile: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update profile
router.put('/me',
  authenticateToken,
  [
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('displayName').optional().trim(),
    body('phoneNumber').optional().isMobilePhone(),
    body('locationName').optional().trim(),
    body('locationLat').optional().isFloat(),
    body('locationLng').optional().isFloat(),
    body('hasCar').optional().isBoolean(),
    body('carSeats').optional().isInt({ min: 1, max: 20 }),
    body('carMpg').optional().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      firstName, lastName, displayName, phoneNumber,
      locationName, locationLat, locationLng,
      hasCar, carSeats, carMpg
    } = req.body;

    try {
      // Update users table if phone number is provided
      if (phoneNumber !== undefined) {
        await query(
          'UPDATE users SET phone_number = $1 WHERE id = $2',
          [phoneNumber, req.user.userId]
        );
      }

      // Build dynamic profile update query
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (firstName !== undefined) {
        updateFields.push(`first_name = $${paramCount++}`);
        values.push(firstName);
      }
      if (lastName !== undefined) {
        updateFields.push(`last_name = $${paramCount++}`);
        values.push(lastName);
      }
      if (displayName !== undefined) {
        updateFields.push(`display_name = $${paramCount++}`);
        values.push(displayName);
      }
      if (locationName !== undefined) {
        updateFields.push(`location_name = $${paramCount++}`);
        values.push(locationName);
      }
      if (locationLat !== undefined) {
        updateFields.push(`location_lat = $${paramCount++}`);
        values.push(locationLat);
      }
      if (locationLng !== undefined) {
        updateFields.push(`location_lng = $${paramCount++}`);
        values.push(locationLng);
      }
      if (hasCar !== undefined) {
        updateFields.push(`has_car = $${paramCount++}`);
        values.push(hasCar);
      }
      if (carSeats !== undefined) {
        updateFields.push(`car_seats = $${paramCount++}`);
        values.push(carSeats);
      }
      if (carMpg !== undefined) {
        updateFields.push(`car_mpg = $${paramCount++}`);
        values.push(carMpg);
      }

      if (updateFields.length > 0) {
        values.push(req.user.userId);
        await query(
          `UPDATE profiles SET ${updateFields.join(', ')} WHERE user_id = $${paramCount}`,
          values
        );
      }

      // Fetch updated profile
      const result = await query(
        `SELECT 
          u.id, u.email, u.phone_number,
          p.first_name, p.last_name, p.display_name,
          p.location_name, p.location_lat, p.location_lng,
          p.has_car, p.car_seats, p.car_mpg, p.avatar_color
        FROM users u
        JOIN profiles p ON u.id = p.user_id
        WHERE u.id = $1`,
        [req.user.userId]
      );

      res.json({
        message: 'Profile updated successfully',
        profile: result.rows[0]
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

// Get another user's public profile
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        u.id, p.first_name, p.last_name, p.display_name,
        p.location_name, p.has_car, p.avatar_color
      FROM users u
      JOIN profiles p ON u.id = p.user_id
      WHERE u.id = $1`,
      [req.params.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ profile: result.rows[0] });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;