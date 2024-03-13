import { Document } from 'mongoose';

export interface Stat extends Document {
    urlId: string;
    ip: string;
    agent?: string;
    referer?: number;
    accessedAt: Date;
}

export interface StatGroup {
    [ip: string]: {
        count: number;
        result: { agent: string; referer: string; accessedAt: Date }[]
    }
}
