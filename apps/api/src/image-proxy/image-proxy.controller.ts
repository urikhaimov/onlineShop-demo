// apps/backend/src/image-proxy/image-proxy.controller.ts
import {
  Controller,
  Get,
  Query,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';

@Controller('proxy-image')
export class ImageProxyController {
  @Get()
  async getImage(@Query('url') url: string, @Res() res: Response) {
    try {
      const response = await axios.get(url, { responseType: 'stream' });

      // Coerce axios's broader AxiosHeaderValue (which now includes boolean)
      // back to the string contract Express expects.
      const ct = response.headers['content-type'];
      if (typeof ct === 'string') {
        res.setHeader('Content-Type', ct);
      }
      res.setHeader('Cache-Control', 'public, max-age=86400'); // optional
      response.data.pipe(res);
    } catch (err) {
      throw new HttpException('Image fetch failed', HttpStatus.BAD_REQUEST);
    }
  }
}
