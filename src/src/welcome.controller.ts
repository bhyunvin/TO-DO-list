import { Controller, Get, HttpCode } from '@nestjs/common';

@Controller()
export class WelcomeController {
  @Get('/')
  welcome(): object {
    return { status: 'ok' };
  }

  @Get('favicon.ico')
  @HttpCode(204)
  favicon() {
    return;
  }
}
