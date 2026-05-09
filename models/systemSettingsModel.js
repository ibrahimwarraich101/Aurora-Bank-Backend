const mongoose = require('mongoose');
const { getModel } = require('../db');

const systemSettingsSchema = new mongoose.Schema({
  setting_key: { type: String, required: true, unique: true },
  setting_value: { type: mongoose.Schema.Types.Mixed, required: true }
});

module.exports = {
  get: () => getModel('SystemSettings', systemSettingsSchema),
  schema: systemSettingsSchema
};
