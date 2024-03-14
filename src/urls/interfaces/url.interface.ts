import { Document } from 'mongoose';
import { StatGroup } from './stat.interface';

export interface Url extends Document {
  originalUrl: string;
  shortUrl: string;
  alias: string;
  accessCount: number;
  deleted?: boolean;
  rateLimit?: number;
}

export interface UrlStats {
  originalUrl: string;
  shortUrl: string;
  alias: string;
  accessCount: number;
  deleted?: boolean;
  rateLimit?: number;
  stats: StatGroup;
}