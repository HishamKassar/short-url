import { Test, TestingModule } from '@nestjs/testing';
import { UrlsService } from './urls.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

const mockUrl1 = { _id: 'url1Id', originalUrl: 'https://example1.com', shortUrl: 'abc123', accessCount: 2 };
const mockUrl2 = { _id: 'url2Id', originalUrl: 'https://example2.com', shortUrl: 'def456', accessCount: 1 };

// Mocking the URL and Stat models
const mockUrlModel = {
  findOne: jest.fn(),
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
        expect(mockUrlModel.findOne).toHaveBeenCalledWith({ shortUrl });
        expect(saveMock).toHaveBeenCalled(); // Check if save method is called on the returned URL object
        expect(mockStatModel.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if URL not found', async () => {
      const shortUrl = 'abc123';
      const req = { ip: '127.0.0.1', headers: { referer: 'https://example.com', 'user-agent': 'TestAgent' } };

      mockUrlModel.findOne.mockResolvedValue(null);

      await expect(service.redirectUrl(shortUrl, req as any)).rejects.toThrow('URL not found');
      expect(mockUrlModel.findOne).toHaveBeenCalledWith({ shortUrl });
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

});
