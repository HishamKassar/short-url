import { Controller, Get, Post, Body, Param, Redirect, Req, Put, HttpCode, Delete, Res, NotFoundException, ForbiddenException} from '@nestjs/common';
import { UrlsService } from '../services/urls.service';
import { ShortenUrlDto, RedirectUrlDto, UrlStatsDto, AliasDto } from '../dto/url.dto';
import { Request } from 'express';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('URLs')
@Controller('api/v1/urls')
export class UrlsController {
  constructor(private readonly urlsService: UrlsService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Create short URL', description: 'Returns the new created short URL from any valid URL, the url should be something like https://example.com' })
  @ApiResponse({ status: 200, description: 'Returns the shortened URL' })
  @ApiResponse({ status: 400, description: 'Returns the error that happened' })
  async shortenUrl(@Body() shortenUrlDto: ShortenUrlDto, @Req() req: Request) {
    const shortUrl = await this.urlsService.shortenUrl(shortenUrlDto.originalUrl);
    return req.protocol + "://" + req.get('host') + req.originalUrl + "/" + shortUrl;
  }

  @Put(':shortUrl')
  @HttpCode(200) 
  @ApiOperation({ summary: 'Set alais and rate limit for short URL', description: 'Set alais by user for the short URL to be used same as auto generated short URL also you can set the rate limit for the URL. You can pass shortUrl or Alias' })
  @ApiResponse({ status: 200, description: 'Returns nothing' })
  @ApiResponse({ status: 400, description: 'Returns the error that happened' })
  @ApiResponse({ status: 404, description: 'Returns not found message if URL is not exist' })
  async updateUrlAlias(@Param('shortUrl') shortUrl: string, @Body() aliasDto: AliasDto, @Req() req: Request): Promise<void> {
    var shortUrlToPass = shortUrl;
    const hostUrl = req.protocol + "://" + req.get('host') + "/api/v1/urls/";
    if (shortUrl.includes(hostUrl)) {
      shortUrlToPass = shortUrl.replace(hostUrl, '');
    }
    await this.urlsService.updateUrlAlias(shortUrlToPass, aliasDto.alias, aliasDto.reateLimit);
  }

  @Delete(':shortUrl')
  @HttpCode(200) 
  @ApiOperation({ summary: 'Delete short URL', description: 'Soft delete for short URL, so the URL still in the database. You can pass shortUrl or Alias' })
  @ApiResponse({ status: 200, description: 'Returns nothing' })
  @ApiResponse({ status: 400, description: 'Returns the error that happened' })
  @ApiResponse({ status: 404, description: 'Returns not found message if URL is not exist' })
  async deleteUrl(@Param('shortUrl') shortUrl: string, @Req() req: Request): Promise<void> {
    var shortUrlToPass = shortUrl;
    const hostUrl = req.protocol + "://" + req.get('host') + "/api/v1/urls/";
    if (shortUrl.includes(hostUrl)) {
      shortUrlToPass = shortUrl.replace(hostUrl, '');
    }
    await this.urlsService.deleteUrl(shortUrlToPass);
  }

  @Get(':shortUrl')
  @ApiOperation({ summary: 'Redirect from short URL to original URL', description: 'This API will automaticity redirect the user to the original URL, it will not work on Swagger because of the redirect, it will work only on the browser' })
  @ApiResponse({ status: 302, description: 'Redirects to the original URL, and in case the url not exist it will redirect the user to not found page' })
  @Redirect()
  async redirectUrl(@Param() redirectUrlDto: RedirectUrlDto, @Req() req: Request) {
    try{
      const originalUrl = await this.urlsService.redirectUrl(redirectUrlDto.shortUrl, req);
      return { url: originalUrl, statusCode: 302 };
    }
    catch (error) {
      if (error instanceof NotFoundException) {
        const notFoundHtml = req.protocol + "://" + req.get('host') + "/404.html";
        return { url: notFoundHtml, statusCode: 302 };
      } else if (error instanceof ForbiddenException) {
        const rateLimitHtml = req.protocol + "://" + req.get('host') + "/RateLimit.html";
        return { url: rateLimitHtml, statusCode: 302 };
      }
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all URLs in the system with statistics', description: 'Returns all the URLs in the system with statistics about each URL, like the total visits for the link and a list of IPs for the users who visited this link and how many times and when, also with information from where like using Chrome or Firefox' })
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
  async getUrls(@Req() req: Request): Promise<UrlStatsDto[]> {
    const urls = await this.urlsService.getUrls();
    
    const urlStatsDtoArray: UrlStatsDto[] = urls.map((urlStats) => {
      
      const { originalUrl, shortUrl, alias, accessCount, deleted, rateLimit, stats } = urlStats;   
      const fullShortUrl = req.protocol + "://" + req.get('host') + req.originalUrl + "/" + shortUrl;
      const fullAlais = req.protocol + "://" + req.get('host') + req.originalUrl + "/" + alias; 
      return {
        originalUrl,
        shortUrl: fullShortUrl,
        alias: fullAlais,
        accessCount,
        deleted,
        rateLimit,
        stats
      };
    });

    return urlStatsDtoArray; 
  }
}