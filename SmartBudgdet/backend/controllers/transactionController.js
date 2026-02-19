const { Transaction } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all transactions for logged-in user
// @route   GET /api/transactions
// @access  Private
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    
    console.log('📊 Fetched transactions count:', transactions.length);
    if (transactions.length > 0) {
      console.log('📊 First transaction description:', transactions[0].description);
    }
    
    res.json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private
exports.createTransaction = async (req, res) => {
  try {
    const {
      partyName,
      amount,
      totalAmount,
      receivedAmount,
      dueAmount,
      balance,
      status,
      type,
      description,
      date
    } = req.body;

    console.log('📝 Creating transaction with description:', description);

    const transaction = await Transaction.create({
      userId: req.user.id,
      partyName,
      amount,
      totalAmount,
      receivedAmount: receivedAmount || 0,
      dueAmount: dueAmount || 0,
      balance: balance || dueAmount || 0,
      status,
      type,
      description: description || '',
      date
    });

    console.log('✅ Created transaction:', transaction.toJSON());

    res.status(201).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating transaction',
      error: error.message
    });
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
exports.updateTransaction = async (req, res) => {
  try {
    console.log('🔵 ========================================');
    console.log('🔵 UPDATE REQUEST RECEIVED');
    console.log('🔵 Transaction ID:', req.params.id);
    console.log('🔵 User ID:', req.user.id);
    console.log('🔵 Request Body:', JSON.stringify(req.body, null, 2));
    console.log('🔵 ========================================');

    const transaction = await Transaction.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!transaction) {
      console.log('❌ Transaction not found');
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    console.log('🔵 BEFORE UPDATE:');
    console.log(JSON.stringify(transaction.toJSON(), null, 2));

    // Update the transaction
    await transaction.update(req.body);
    
    // Reload to get fresh data from database
    await transaction.reload();
    
    console.log('🔵 AFTER UPDATE:');
    console.log(JSON.stringify(transaction.toJSON(), null, 2));
    console.log('🔵 Description value:', `"${transaction.description}"`);
    console.log('🔵 Description type:', typeof transaction.description);
    console.log('🔵 ========================================');

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('❌ Error updating transaction:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(400).json({
      success: false,
      message: 'Error updating transaction',
      error: error.message
    });
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    await transaction.destroy();

    res.json({
      success: true,
      data: {},
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(400).json({
      success: false,
      message: 'Error deleting transaction',
      error: error.message
    });
  }
};

// @desc    Get transaction statistics
// @route   GET /api/transactions/stats
// @access  Private
exports.getTransactionStats = async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    
    const stats = await Transaction.findAll({
      where: { userId: req.user.id },
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'total'],
        [sequelize.fn('SUM', sequelize.col('dueAmount')), 'totalDue'],
        [sequelize.fn('SUM', sequelize.col('receivedAmount')), 'totalReceived']
      ],
      group: ['type']
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};