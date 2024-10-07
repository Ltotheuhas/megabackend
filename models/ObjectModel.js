const mongoose = require('mongoose');

const ObjectSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  position: {
    x: {
      type: Number,
      required: true,
      default: 0,
    },
    y: {
      type: Number,
      required: true,
      default: 0,
    },
    z: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  rotation: {
    isEuler: {
      type: Boolean,
      default: true,
    },
    _x: {
      type: Number,
      required: true,
      default: 0,
    },
    _y: {
      type: Number,
      required: true,
      default: 0,
    },
    _z: {
      type: Number,
      required: true,
      default: 0,
    },
    _order: {
      type: String,
      required: true,
      default: 'XYZ',
    },
  },
  uuid: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('Object', ObjectSchema);
