const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  setting_key: { type: String, required: true, unique: true },
  setting_value: { type: mongoose.Schema.Types.Mixed, required: true }
});

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
