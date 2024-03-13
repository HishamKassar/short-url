import * as mongoose from 'mongoose';

export const StatSchema = new mongoose.Schema({
    urlId: { type: mongoose.Schema.Types.ObjectId, ref: 'Url', required: true },
    ip: { type: String, required: true },
    agent: String,
    referer: String,
    accessedAt: { type: Date, default: Date.now },
});
  