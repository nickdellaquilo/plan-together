const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('@plan-together/database');
const { generateToken } = require('../middleware/auth');

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('phoneNumber').optional().isMobilePhone().withMessage('Invalid phone number'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', registerValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, firstName, lastName, phoneNumber } = req.body;

  try {
    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 OR phone_number = $2',
      [email, phoneNumber || null]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'User already exists with this email or phone number'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Use transaction to create user and profile atomically
    const result = await transaction(async (client) => {
      // Create user
      const userResult = await client.query(
        'INSERT INTO users (email, password_hash, phone_number) VALUES ($1, $2, $3) RETURNING id, email, created_at',
        [email, passwordHash, phoneNumber || null]
      );

      const user = userResult.rows[0];

      // Generate random avatar color
      const colors = ['#ef4444', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
      const avatarColor = colors[Math.floor(Math.random() * colors.length)];

      // Create profile
      const profileResult = await client.query(
        `INSERT INTO profiles (user_id, first_name, last_name, display_name, avatar_color)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [user.id, firstName, lastName, `${firstName} ${lastName}`, avatarColor]
      );

      return {
        user,
        profile: profileResult.rows[0]
      };
    });

    // Generate JWT token
    const token = generateToken(result.user.id, result.user.email);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.profile.first_name,
        lastName: result.profile.last_name,
        avatarColor: result.profile.avatar_color,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT
 */
router.post('/login', loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Get user with profile
    const result = await query(
      `SELECT
        u.id, u.email, u.password_hash,
        p.first_name, p.last_name, p.display_name, p.avatar_color
      FROM users u
      JOIN profiles p ON u.id = p.user_id
      WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        displayName: user.display_name,
        avatarColor: user.avatar_color,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;