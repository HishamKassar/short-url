import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UrlsController } from './urls.controller';
import { UrlsService } from './urls.service';
import { UrlSchema } from './schemas/url.schema';
import { StatSchema } from './schemas/stat.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Url', schema: UrlSchema },
      { name: 'Stat', schema: StatSchema }
    ]),
  ],
  controllers: [UrlsController],
  providers: [UrlsService],
})
export class UrlsModule {}