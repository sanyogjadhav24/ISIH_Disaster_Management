import mongoose from 'mongoose';

const FireSchema = new mongoose.Schema({
  latitude: Number,
  longitude: Number,
  brightness: Number,
  confidence: mongoose.Schema.Types.Mixed, 
  satellite: String,
  acq_date: String,
  acq_time: String,
  frp: Number,
  scan: Number,
  track: Number,
  version: String,
  bright_t31: Number,
  daynight: String,
}, {
  timestamps: true,
  collection: 'test' 
});

export const Fire = mongoose.models.Fire || mongoose.model('Fire', FireSchema);