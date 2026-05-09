const mongoose = require('mongoose');
const { getModel } = require('../db');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: null },
  role: { type: String, enum: ['admin', 'employee', 'guest'], default: 'employee' },
  is_active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = {
  get: () => getModel('User', userSchema),
  userSchema
};
