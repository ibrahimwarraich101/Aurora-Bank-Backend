const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { AsyncLocalStorage } = require('async_hooks');

dotenv.config();

const asyncLocalStorage = new AsyncLocalStorage();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/aurora_bank");
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

// Start connection
connectDB();

/**
 * Multi-tenant helper: Returns the connection for the current context
 */
const getActiveConnection = () => {
  const store = asyncLocalStorage.getStore();
  if (store && store.guestDbName) {
    // .useDb() returns a connection to the specific DB, reusing the same base connection pool
    return mongoose.connection.useDb(store.guestDbName, { useCache: true });
  }
  return mongoose.connection;
};

/**
 * Helper to get a model bound to the active connection.
 * It ensures that the model is registered on the specific connection (guest or main).
 */
const getModel = (modelName, schema) => {
  const conn = getActiveConnection();
  // Check if model is already registered on this connection to avoid errors
  return conn.models[modelName] || conn.model(modelName, schema);
};

module.exports = {
  mongoose,
  connectDB,
  getActiveConnection,
  getModel,
  asyncLocalStorage
};