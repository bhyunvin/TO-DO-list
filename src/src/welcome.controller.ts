import { Controller, Get } from '@nestjs/common';

@Controller()
export class WelcomeController {
  @Get('/')
  welcome(): object {
    return { message: 'Welcome to the Todo App API!', status: 'live' };
  }
}
