const { Sequelize } = require('sequelize');

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false, // Set to console.log to see SQL queries
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);


const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('🟢 PostgreSQL Database Connected');
    console.log('✅ PostgreSQL Database Connected Successfully');
    console.log(`📊 Connected to database: ${process.env.DB_NAME}`);
    
    // Sync all models (create tables if they don't exist)
    await sequelize.sync({ alter: false }); // Use { force: true } to drop and recreate tables
    console.log('✅ Database Models Synchronized');
  } catch (error) {
    console.error('❌ Unable to connect to PostgreSQL:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };