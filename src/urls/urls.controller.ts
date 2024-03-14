import { Controller, Get, Post, Body, Param, Redirect, Req} from '@nestjs/common';
import { UrlsService } from './urls.service';
import { ShortenUrlDto, RedirectUrlDto, UrlStatsDto } from './dto/url.dto';
import { Request } from 'express';
import { ApiNotFoundResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('URLs')
@Controller('api/v1/urls')
export class UrlsController {
  constructor(private readonly urlsService: UrlsService) {}

  @Post()
  @ApiOperation({ summary: 'Create short URL', description: 'Returns the new created short URL from any valid URL, the url should be something like https://example.com' })
  @ApiResponse({ status: 200, description: 'Returns the shortened URL' })
  @ApiResponse({ status: 400, description: 'Returns the error that happened' })
  async shortenUrl(@Body() shortenUrlDto: ShortenUrlDto, @Req() req: Request) {
    const shortUrl = await this.urlsService.shortenUrl(shortenUrlDto.originalUrl);
    return req.protocol + "://" + req.get('host') + req.originalUrl + "/" + shortUrl;
  }

  @Get(':shortUrl')
  @ApiOperation({ summary: 'Redirect from short URL to original URL', description: 'This API will automaticity redirect the user to the original URL, it will not work on Swagger because of the redirect, it will work only on the browser' })
  @ApiResponse({ status: 302, description: 'Redirects to the original URL' })
  @ApiNotFoundResponse({ status: 404, description: 'Returns not found error if the URL is not exist' })
  @Redirect()
  async redirectUrl(@Param() redirectUrlDto: RedirectUrlDto, @Req() req: Request) {
    const originalUrl = await this.urlsService.redirectUrl(redirectUrlDto.shortUrl, req);
    return { url: originalUrl, statusCode: 302 };
  }

  @Get()
  @ApiOperation({ summary: 'Get all URLs in the system with statistics', description: 'Returns all the URLs in the system with statistics about each URL, like the total visit for the link and a list of IPs for the users who visited this link and how many times and when, also with information from where like using chrome or firefox' })
  @ApiResponse({
    status: 200,
    description: 'Returns URLs with stats',
    type: UrlStatsDto,
    schema: {
      example: [
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
                  accessedAt: '2024-03-13T12:00:00.000Z'
                }
              ]
            }
          }
        },
        {
          originalUrl: 'https://anotherexample.com',
          shortUrl: 'def456',
          accessCount: 10,
          stats: {
            '127.0.0.1': {
              count: 5,
              result: [
                {
                  agent: 'Chrome',
                  referer: 'https://anotherexample.com',
                  accessedAt: '2024-03-14T12:00:00.000Z'
                }
              ]
            }
          }
        }
      ]
    }
  })
  async getUrls(): Promise<UrlStatsDto[]> {
    const urls = await this.urlsService.getUrls();
    
    const urlStatsDtoArray: UrlStatsDto[] = urls.map((urlStats) => {
      const { originalUrl, shortUrl, accessCount, stats } = urlStats;    
      return {
        originalUrl,
        shortUrl,
        accessCount,
        stats
      };
    });

    return urlStatsDtoArray; 
  }
}