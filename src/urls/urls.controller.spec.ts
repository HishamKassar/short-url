import { Test, TestingModule } from '@nestjs/testing';
import { UrlsController } from './urls.controller';
import { UrlsService } from './urls.service';
import { ShortenUrlDto, RedirectUrlDto, UrlStatsDto } from './dto/url.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('UrlsController', () => {
    let controller: UrlsController;
    let service: UrlsService;
  
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [UrlsController],
        providers: [{
          provide: UrlsService,
          useValue: {
            shortenUrl: jest.fn(),
            redirectUrl: jest.fn(),
            getUrls: jest.fn(),
          }
        }],
      }).compile();
  
      controller = module.get<UrlsController>(UrlsController);
      service = module.get<UrlsService>(UrlsService);
    });
  
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should handle unexpected errors from the service', async () => {
        const dto: ShortenUrlDto = { originalUrl: 'https://example.com' };
        const req: any = { protocol: 'http', get: jest.fn(), originalUrl: '/example' };
        jest.spyOn(service, 'shortenUrl').mockRejectedValue(new Error('Internal Server Error'));
        await expect(controller.shortenUrl(dto, req)).rejects.toThrow('Internal Server Error');
    });
  
    describe('shortenUrl', () => {
      it('should call service.shortenUrl with correct arguments', async () => {
        const dto: ShortenUrlDto = { originalUrl: 'https://example.com' };
        const req: any = { protocol: 'http', get: jest.fn(), originalUrl: '/example' };
        await controller.shortenUrl(dto, req);
        expect(service.shortenUrl).toHaveBeenCalledWith(dto.originalUrl);
      });

      it('should return the shortened URL', async () => {
        const dto: ShortenUrlDto = { originalUrl: 'https://example.com' };
        const shortUrl = 'abc123';
        const req: any = { protocol: 'http', get: jest.fn(), originalUrl: '/example' };
        const fullShortUrl = req.protocol + "://" + req.get('host') + req.originalUrl + "/" + shortUrl;
        jest.spyOn(service, 'shortenUrl').mockResolvedValue(shortUrl);
        expect(await controller.shortenUrl(dto, req)).toBe(fullShortUrl);
      });

      it('should throw error for invalid URL', async () => {
        const dto: ShortenUrlDto = { originalUrl: 'invalid-url' };
        const req: any = { protocol: 'http', get: jest.fn(), originalUrl: '/example' };
        try {
          await controller.shortenUrl(dto, req);
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          expect(error.message).toEqual('Invalid URL.');
        }
      });

      it('should throw error for empty URL', async () => {
        const dto: ShortenUrlDto = { originalUrl: '' };
        const req: any = { protocol: 'http', get: jest.fn(), originalUrl: '/example' };
        try {
          await controller.shortenUrl(dto, req);
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          expect(error.message).toEqual('Must be a string!');
        }
      });
    });
  
    describe('redirectUrl', () => {
      it('should call service.redirectUrl with correct arguments', async () => {
        const dto: RedirectUrlDto = { shortUrl: 'abc123' };
        const req: any = { ip: '127.0.0.1' };
        await controller.redirectUrl(dto, req);
        expect(service.redirectUrl).toHaveBeenCalledWith(dto.shortUrl, req);
      });

      it('should return a redirection response', async () => {
        const dto: RedirectUrlDto = { shortUrl: 'abc123' };
        const req: any = { ip: '127.0.0.1' };
        const originalUrl = 'https://example.com';
        jest.spyOn(service, 'redirectUrl').mockResolvedValue(originalUrl);
        const response = await controller.redirectUrl(dto, req);
        expect(response.url).toBe(originalUrl);
        expect(response.statusCode).toBe(302);
      });
  
      it('should handle NotFoundException from service', async () => {
        const dto: RedirectUrlDto = { shortUrl: 'abc123' };
        const req: any = { ip: '127.0.0.1' };
        jest.spyOn(service, 'redirectUrl').mockRejectedValue(new NotFoundException());
        expect(controller.redirectUrl(dto, req)).rejects.toThrow(NotFoundException);
      });

      it('should not expose sensitive information in error messages', async () => {
        const dto: RedirectUrlDto = { shortUrl: 'nonexistent' };
        jest.spyOn(service, 'redirectUrl').mockRejectedValue(new NotFoundException('URL not found'));
        await expect(controller.redirectUrl(dto, {} as any)).rejects.toThrow('URL not found');
      });
    });
  
    describe('getUrls', () => {
      it('should call service.getUrls and return URLs with stats', async () => {
        const urls: UrlStatsDto[] = [
          {
            originalUrl: 'https://example.com',
            shortUrl: 'abc123',
            accessCount: 5,
            stats: {
              '127.0.0.1': {
                count: 3,
                result: [
                  {
                    agent: 'Mozilla',
                    referer: null,
                    accessedAt: new Date('2024-03-13T12:00:00.000Z')
                  }
                ]
              }
            }
          }
        ];
        jest.spyOn(service, 'getUrls').mockResolvedValue(urls);
        expect(await controller.getUrls()).toEqual(urls);
      });

      it('should handle empty array in getUrls', async () => {
        jest.spyOn(service, 'getUrls').mockResolvedValue([]);
        const result = await controller.getUrls();
        expect(result).toEqual([]);
      });

    });
});