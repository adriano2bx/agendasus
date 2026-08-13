import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { WebhooksService } from './webhooks.service.js';

@Controller('webhooks/gupshup')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @HttpCode(202)
  receive(@Body() payload: unknown, @Headers('x-confirma-webhook-secret') secret?: string) {
    return this.webhooksService.receive(payload, secret);
  }
}
