import { Test, TestingModule } from '@nestjs/testing';
import { UrlsService } from './urls.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockUrl1 = { _id: 'url1Id', originalUrl: 'https://example1.com', shortUrl: 'abc123', accessCount: 2 };
const mockUrl2 = { _id: 'url2Id', originalUrl: 'https://example2.com', shortUrl: 'def456', accessCount: 1 };

// Mocking the URL and Stat models
const mockUrlModel = {
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  find: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([mockUrl1, mockUrl2]),
  create: jest.fn(),
};

const mockStatModel = {
  create: jest.fn(),
  aggregate: jest.fn()
};

describe('UrlsService', () => {
  let service: UrlsService;
  let urlModel: Model<any>;
  let statModel: Model<any>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlsService,
        { provide: getModelToken('Url'), useValue: mockUrlModel },
        { provide: getModelToken('Stat'), useValue: mockStatModel },
      ],
    }).compile();

    service = module.get<UrlsService>(UrlsService);
    urlModel = module.get<Model<any>>(getModelToken('Url'));
    statModel = module.get<Model<any>>(getModelToken('Stat'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('shortenUrl', () => {
    it('should return a short URL', async () => {
      const originalUrl = 'https://example.com';
      const shortUrl = 'abc123';

      const saveMock = jest.fn().mockResolvedValue({ originalUrl, shortUrl });

      mockUrlModel.create.mockImplementation(saveMock);

      const result = await service.shortenUrl(originalUrl);
      expect(result).toEqual(shortUrl);
      expect(mockUrlModel.create).toHaveBeenCalled();
    });
  });

  describe('redirectUrl', () => {
    it('should redirect to original URL and save stats', async () => {
      const shortUrl = 'abc123';
      const req = { ip: '127.0.0.1', headers: { referer: 'https://example.com', 'user-agent': 'TestAgent' } };
      const url = { _id: 'someId', originalUrl: 'https://example.com', accessCount: 0 };
  
      const saveMock = jest.fn().mockResolvedValue(url);
      const findOneMock = jest.fn().mockResolvedValue({ ...url, save: saveMock });
  
      mockUrlModel.findOne.mockImplementation(findOneMock);
      mockStatModel.create.mockResolvedValue({});
  
      const result = await service.redirectUrl(shortUrl, req as any);
  
      expect(result).toEqual(url.originalUrl);
  
      expect(mockUrlModel.findOne).toHaveBeenCalledWith({
        $and: [
          { $or: [{ shortUrl }, { alias: shortUrl }] },
          { deleted: { $ne: true } }
        ]
      });

      expect(saveMock).toHaveBeenCalled();
  
      expect(mockStatModel.create).toHaveBeenCalledWith({
        urlId: url._id,
        ip: req.ip,
        referer: req.headers.referer,
        agent: req.headers['user-agent'],
        accessedAt: expect.any(Date)
      });
    });

    it('should throw NotFoundException if URL not found', async () => {
      const shortUrl = 'abc123';
      const req = { ip: '127.0.0.1', headers: { referer: 'https://example.com', 'user-agent': 'TestAgent' } };

      mockUrlModel.findOne.mockResolvedValue(null);

      await expect(service.redirectUrl(shortUrl, req as any)).rejects.toThrow('URL not found');
      expect(mockUrlModel.findOne).toHaveBeenCalledWith({
        $and: [
          { $or: [{ shortUrl }, { alias: shortUrl }] },
          { deleted: { $ne: true } }
        ]
      });
    });
  });

  describe('getUrls', () => {
    it('should return URLs with stats', async () => {
      const stats = [
        {
          _id: { urlId: 'url1Id', ip: '127.0.0.1' },
          count: 2,
          result: [{ agent: 'TestAgent', referer: 'https://example.com', accessedAt: new Date() }],
        },
        {
          _id: { urlId: 'url2Id', ip: '127.0.0.1' },
          count: 1,
          result: [{ agent: 'TestAgent', referer: 'https://example.com', accessedAt: new Date() }],
        },
      ];

      mockStatModel.aggregate.mockResolvedValue(stats);

      const result = await service.getUrls();

      expect(result).toEqual([
        {
          originalUrl: mockUrl1.originalUrl,
          shortUrl: mockUrl1.shortUrl,
          accessCount: mockUrl1.accessCount,
          stats: {
            '127.0.0.1': {
              count: 2,
              result: [{ agent: 'TestAgent', referer: 'https://example.com', accessedAt: expect.any(Date) }],
            },
          },
        },
        {
          originalUrl: mockUrl2.originalUrl,
          shortUrl: mockUrl2.shortUrl,
          accessCount: mockUrl2.accessCount,
          stats: {
            '127.0.0.1': {
              count: 1,
              result: [{ agent: 'TestAgent', referer: 'https://example.com', accessedAt: expect.any(Date) }],
            },
          },
        },
      ]);
      expect(mockUrlModel.find).toHaveBeenCalled();
      expect(mockStatModel.aggregate).toHaveBeenCalled();
    });
  });

  describe('updateUrlAlias', () => {
    it('should update URL alias', async () => {
      const shortUrl = 'abc123';
      const alias = 'newAlias';
      const existingUrl = { shortUrl, alias: 'oldAlias' };
  
      mockUrlModel.findOne.mockResolvedValue(existingUrl);
  
      const updatedUrl = { shortUrl, alias };
      mockUrlModel.findOneAndUpdate.mockResolvedValue(updatedUrl);
  
      await expect(service.updateUrlAlias(shortUrl, alias)).resolves.not.toThrow();
  
      expect(mockUrlModel.findOne).toHaveBeenCalledWith({
        $and: [
          { $or: [{ shortUrl }, { alias: shortUrl }] },
          { deleted: { $ne: true } }
        ]
      });
      expect(mockUrlModel.findOneAndUpdate).toHaveBeenCalledWith(
        { shortUrl },
        { alias },
        { new: true }
      );
    });

    it('should throw BadRequestException if alias already used before', async () => {
      const shortUrl = 'abc123';
      const alias = 'existingAlias';
      const urlAlias = { _id: 'someId', shortUrl: 'anotherShortUrl', alias: 'existingAlias' };
  
      mockUrlModel.findOne.mockResolvedValue(urlAlias);
  
      await expect(service.updateUrlAlias(shortUrl, alias)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if URL not found', async () => {
      const shortUrl = 'abc123';
      const alias = 'newAlias';
  
      mockUrlModel.findOne.mockResolvedValue(null);
      mockUrlModel.findOneAndUpdate.mockResolvedValue(null);

      await expect(service.updateUrlAlias(shortUrl, alias)).rejects.toThrow(NotFoundException);
    });

  });

  describe('deleteUrl', () => {
    it('should delete URL successfully', async () => {
      const shortUrl = 'abc123';
      const url = { _id: 'someId', shortUrl, deleted: false, save: jest.fn() };
  
      mockUrlModel.findOne.mockResolvedValue(url);
  
      await service.deleteUrl(shortUrl);
  
      expect(mockUrlModel.findOne).toHaveBeenCalledWith({
        $and: [
          { $or: [{ shortUrl }, { alias: shortUrl }] },
          { deleted: { $ne: true } }
        ]
      });
      expect(url.deleted).toBe(true);
      expect(url.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if URL not found', async () => {
      const shortUrl = 'abc123';
  
      mockUrlModel.findOne.mockResolvedValue(null);
  
      await expect(service.deleteUrl(shortUrl)).rejects.toThrowError(NotFoundException);
    });

  });

});
