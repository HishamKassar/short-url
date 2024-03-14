import * as mongoose from 'mongoose';

export const UrlSchema = new mongoose.Schema({
  originalUrl: { type: String, required: true },
  shortUrl: { type: String, required: true },
  alias: String,
  accessCount: { type: Number, default: 0 }
});
