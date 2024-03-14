import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUrl } from 'class-validator';

export class ShortenUrlDto {
    @ApiProperty()
    @IsString({ message: 'Must be a string!' })
    @IsUrl(undefined, { message: 'Invalid URL.' })
    originalUrl: string;
}
  
export class RedirectUrlDto {
    @ApiProperty()
    shortUrl: string;
}

export class AliasDto {
    @ApiProperty()
    alias: string;

    @ApiProperty()
    reateLimit?: number;
}

export class StatGroupDto {
    [ip: string]: {
        count: number;
        result: { agent: string; referer: string; accessedAt: Date }[]
    }
}

export class UrlStatsDto {
    @ApiProperty()
    originalUrl: string;

    @ApiProperty()
    shortUrl: string;

    @ApiProperty()
    alias: string;

    @ApiProperty()
    accessCount: number;

    @ApiProperty()
    deleted?: boolean;

    @ApiProperty()
    reateLimit?: number;

    @ApiProperty()
    stats: StatGroupDto;

    constructor() {
        this.stats = {};
    }
}