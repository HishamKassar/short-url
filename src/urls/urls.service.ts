import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Url, UrlStats } from './interfaces/url.interface';
import { nanoid } from 'nanoid';
import { Request } from 'express';
import { Stat } from './interfaces/stat.interface';

@Injectable()
export class UrlsService {
  constructor(
    @InjectModel('Url') private readonly urlModel: Model<Url>,
    @InjectModel('Stat') private readonly statModel: Model<Stat>
    ) {}

  async shortenUrl(originalUrl: string): Promise<string> {
    const shortUrl = nanoid();
    const createdUrl = await this.urlModel.create({ originalUrl, shortUrl });
    return createdUrl.shortUrl;
  }

  async redirectUrl(shortUrl: string, req:Request): Promise<string> {
    const url = await this.urlModel.findOne({ shortUrl });
    if (!url) {
      throw new NotFoundException('URL not found');
    }
    url.accessCount++;
    await url.save();

    await this.statModel.create({ urlId: url._id, ip: req.ip, referer: req.headers.referer, agent: req.headers['user-agent'], accessedAt: new Date() });

    return url.originalUrl;
  }

  async getUrls(): Promise<UrlStats[]> {
    const stats = await this.statModel.aggregate([
      {
          $group: {
              _id: { urlId: '$urlId', ip: '$ip' },
              count: { $sum: 1 },
              result: {
                $push: {
                    agent: '$agent',
                    referer: '$referer',
                    accessedAt: '$accessedAt'
                }
              }
          }
      }
    ]);

    const urls = await this.urlModel.find().exec();

    const result = urls.map(url => {
      const urlStats = {};
      stats
          .filter(stat => String(stat._id.urlId) === String(url._id))
          .forEach(stat => {
              urlStats[stat._id.ip] = {
                  count: stat.count,
                  result: stat.result
              };
          });

      return {
          originalUrl: url.originalUrl,
          shortUrl: url.shortUrl,
          accessCount: url.accessCount,
          stats: urlStats
      };
    });

    return result;
  }
}
