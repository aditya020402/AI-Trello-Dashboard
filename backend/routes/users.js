const express = require('express');
const { query } = require('../db');
const { hashPassword, comparePassword, generateToken } = require('../auth');
const { authenticateToken } = require('../middleware');

const router = express.Router();

function isValidISODate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function calculateStreakCount(completedDates) {
  const completedSet = new Set(completedDates);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const format = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  let cursor = new Date(today);
  if (!completedSet.has(format(today))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (completedSet.has(format(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

async function getStreakPayload(userId) {
  const streakRows = await query(
    `SELECT TO_CHAR(streak_date, 'YYYY-MM-DD') as date_str
     FROM user_daily_streaks
     WHERE user_id = $1
     ORDER BY streak_date ASC`,
    [userId]
  );

  const completedDates = streakRows.rows.map((row) => row.date_str);

  return {
    completedDates,
    streakCount: calculateStreakCount(completedDates),
  };
}

/**
 * Register a new user
 * POST /api/users/register
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if user already exists
    const existingUser = await query('SELECT * FROM users WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert new user
    const result = await query(
      'INSERT INTO users (username, password_hash, email) VALUES ($1, $2, $3) RETURNING id, username, email, is_dyslexic',
      [username, passwordHash, email || null]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Login user
 * POST /api/users/login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user by username
    const result = await query('SELECT id, username, password_hash, email, profile_photo_url, status, bio, is_dyslexic FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Compare passwords
    const passwordMatch = await comparePassword(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate token
    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profile_photo_url: user.profile_photo_url,
        status: user.status || 'available',
        bio: user.bio,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get current user info
 * GET /api/users/me
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT id, username, email, profile_photo_url, status, bio, is_dyslexic, created_at FROM users WHERE id = $1', [req.userId]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update user profile
 * PATCH /api/users/profile
 */
router.patch('/profile', authenticateToken, async (req, res) => {
  try {
    const { username, profilePhotoUrl, status, bio, isDyslexic } = req.body;

    console.log('Profile update request:', { userId: req.userId, username, profilePhotoUrl: profilePhotoUrl ? 'base64...' : null, status, bio, isDyslexic });

    // Check if new username is already taken (if username is being changed)
    if (username) {
      const existingUser = await query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username, req.userId]
      );
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: 'Username already taken' });
      }
    }

    // Update user profile - only update fields that are explicitly provided
    const result = await query(`
      UPDATE users
      SET 
        username = $1,
        profile_photo_url = $2,
        status = $3,
        bio = $4,
        is_dyslexic = COALESCE($5, is_dyslexic),
        updated_at = NOW()
      WHERE id = $6
      RETURNING id, username, email, profile_photo_url, status, bio, is_dyslexic
    `, [username, profilePhotoUrl, status, bio, isDyslexic, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = result.rows[0];

    console.log('Profile updated successfully for user:', updatedUser.id);

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * Get streak data for current user
 * GET /api/users/streak
 */
router.get('/streak', authenticateToken, async (req, res) => {
  try {
    const streakPayload = await getStreakPayload(req.userId);
    res.json(streakPayload);
  } catch (error) {
    console.error('Get streak error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Mark a daily task as completed for a date
 * PUT /api/users/streak
 */
router.put('/streak', authenticateToken, async (req, res) => {
  try {
    const { date } = req.body;
    if (!date || !isValidISODate(date)) {
      return res.status(400).json({ error: 'Valid date is required in YYYY-MM-DD format' });
    }

    // Only allow marking today's date
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (date !== todayStr) {
      return res.status(400).json({ error: 'Can only mark today\'s task as complete' });
    }

    await query(
      `INSERT INTO user_daily_streaks (user_id, streak_date)
       VALUES ($1, $2::date)
       ON CONFLICT (user_id, streak_date) DO NOTHING`,
      [req.userId, date]
    );

    const streakPayload = await getStreakPayload(req.userId);
    res.json(streakPayload);
  } catch (error) {
    console.error('Mark streak day error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Unmark a daily task completion for a date
 * DELETE /api/users/streak/:date
 */
router.delete('/streak/:date', authenticateToken, async (req, res) => {
  try {
    const { date } = req.params;
    if (!date || !isValidISODate(date)) {
      return res.status(400).json({ error: 'Valid date is required in YYYY-MM-DD format' });
    }

    // Only allow unmarking today's date
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (date !== todayStr) {
      return res.status(400).json({ error: 'Can only unmark today\'s task' });
    }

    await query(
      `DELETE FROM user_daily_streaks
       WHERE user_id = $1 AND streak_date = $2::date`,
      [req.userId, date]
    );

    const streakPayload = await getStreakPayload(req.userId);
    res.json(streakPayload);
  } catch (error) {
    console.error('Unmark streak day error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
