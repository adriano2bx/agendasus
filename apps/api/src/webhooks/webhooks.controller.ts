import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { WebhooksService } from './webhooks.service.js';

@Controller('webhooks/gupshup')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @HttpCode(202)
  receive(@Body() payload: unknown) {
    return this.webhooksService.receive(payload);
  }
}

