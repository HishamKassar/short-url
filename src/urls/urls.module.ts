import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UrlsController } from './controllers/urls.controller';
import { UrlsService } from './services/urls.service';
import { UrlSchema } from './schemas/url.schema';
import { StatSchema } from './schemas/stat.schema';
import { ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Url', schema: UrlSchema },
      { name: 'Stat', schema: StatSchema }
    ]),
    CacheModule.register()
  ],
  controllers: [UrlsController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    },
    UrlsService
  ],
})
export class UrlsModule {}