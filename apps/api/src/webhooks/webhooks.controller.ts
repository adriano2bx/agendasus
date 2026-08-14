import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { WebhooksService } from './webhooks.service.js';

@Controller('webhooks/gupshup')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @HttpCode(204)
  async receive(@Body() payload: unknown, @Headers('x-confirma-webhook-secret') secret?: string) {
    await this.webhooksService.receive(payload, secret);
  }
}
