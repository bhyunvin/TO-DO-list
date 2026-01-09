import { Controller, Get } from '@nestjs/common';

@Controller()
export class WelcomeController {
  @Get('/')
  welcome(): object {
    return { status: 'ok' };
  }
}
