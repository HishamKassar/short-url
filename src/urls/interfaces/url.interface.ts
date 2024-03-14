import { Document } from 'mongoose';
import { StatGroup } from './stat.interface';

export interface Url extends Document {
  originalUrl: string;
  shortUrl: string;
  alias: string;
  accessCount: number;
}

export interface UrlStats {
  originalUrl: string;
  shortUrl: string;
  alias: string;
  accessCount: number;
  stats: StatGroup;
}