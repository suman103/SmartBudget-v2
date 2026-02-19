const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  partyName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'party_name'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'total_amount'
  },
  receivedAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'received_amount'
  },
  dueAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'due_amount'
  },
  balance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('PAID', 'UNPAID'),
    defaultValue: 'UNPAID'
  },
  type: {
    type: DataTypes.ENUM('credit', 'debit'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: ''
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  }
}, {
  tableName: 'transactions',
  timestamps: true,
  underscored: false
});

module.exports = Transaction;