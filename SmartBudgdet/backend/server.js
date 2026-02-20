const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();

// ✅ CORS fix - works with all Express versions
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning');
  res.setHeader('ngrok-skip-browser-warning', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'SmartBudget',
  password: 'suman123',
  port: 5432,
});

// Test database connection
pool.connect((err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ PostgreSQL Database Connected Successfully');
  }
});

// JWT Secret
const JWT_SECRET = 'your_super_secret_jwt_key_change_this_in_production';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// ==================== AUTH ROUTES ====================

// Register user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, phone } = req.body;

    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userExists.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (full_name, email, password, phone, company_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, phone, company_name',
      [fullName, email, hashedPassword, phone || null, 'SmartBudget']
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        companyName: user.company_name
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        companyName: user.company_name
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Forgot Password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No user found with that email address'
      });
    }

    const user = result.rows[0];

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetExpire = new Date(Date.now() + 10 * 60 * 1000);
    
    await pool.query(
      'UPDATE users SET reset_password_token = $1, reset_password_expire = $2 WHERE id = $3',
      [hashedToken, resetExpire, user.id]
    );

    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

    console.log('🔐 Password Reset Token:', resetToken);
    console.log('📧 Reset URL:', resetUrl);
    console.log('⏰ Expires:', resetExpire);

    res.status(200).json({
      success: true,
      message: 'Password reset email sent',
      resetToken: resetToken,
      resetUrl: resetUrl
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending reset email',
      error: error.message
    });
  }
});

// Reset Password (token-based)
app.post('/api/auth/reset-password/:resetToken', async (req, res) => {
  try {
    const { resetToken } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a new password'
      });
    }

    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    const result = await pool.query(
      'SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expire > $2',
      [hashedToken, new Date()]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const user = result.rows[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expire = NULL WHERE id = $2',
      [hashedPassword, user.id]
    );

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone
      }
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: error.message
    });
  }
});

// Direct Reset Password (by email only - no token needed)
app.post('/api/auth/direct-reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    const user = result.rows[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, user.id]
    );

    console.log('✅ Password reset for:', email);

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('❌ Direct reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: error.message
    });
  }
});

// ==================== TRANSACTION ROUTES ====================

// Get all transactions for logged-in user
app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC',
      [req.user.id]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('❌ Error fetching transactions:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add new transaction
app.post('/api/transactions', authenticateToken, async (req, res) => {
  const {
    party_name, partyName,
    amount,
    total_amount, totalAmount,
    received_amount, receivedAmount,
    due_amount, dueAmount,
    balance,
    status,
    type,
    description,
    date
  } = req.body;

  const finalPartyName   = party_name || partyName;
  const finalTotal       = total_amount || totalAmount || amount || 0;
  const finalAmount      = amount || finalTotal;
  const finalReceived    = received_amount || receivedAmount || 0;
  const finalDue         = due_amount || dueAmount || 0;
  const finalBalance     = balance || finalDue || 0;

  try {
    const result = await pool.query(
      `INSERT INTO transactions 
      (user_id, party_name, amount, total_amount, received_amount, due_amount, balance, status, type, description, date) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      RETURNING *`,
      [
        req.user.id,
        finalPartyName,
        finalAmount,
        finalTotal,
        finalReceived,
        finalDue,
        finalBalance,
        status || 'UNPAID',
        type || 'credit',
        description || '',
        date || new Date().toISOString().split('T')[0]
      ]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Error creating transaction:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update transaction
app.put('/api/transactions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { receivedAmount, dueAmount, balance, status, description } = req.body;

    const currentTxn = await pool.query(
      'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (currentTxn.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const result = await pool.query(
      `UPDATE transactions 
       SET received_amount = $1, due_amount = $2, balance = $3, status = $4, description = $5
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [receivedAmount, dueAmount, balance, status, description, id, req.user.id]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Error updating transaction:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete transaction
app.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (err) {
    console.error('❌ Error deleting transaction:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
 
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});