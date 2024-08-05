const mongoose = require('mongoose');

const ObjectSchema = new mongoose.Schema({
  type: String,
  url: String,
  base64: String, // Add this line
  position: {
    x: Number,
    y: Number,
    z: Number
  },
  rotation: {
    isEuler: Boolean,
    _x: Number,
    _y: Number,
    _z: Number,
    _order: String
  },
  uuid: String
});

module.exports = mongoose.model('Object', ObjectSchema);
