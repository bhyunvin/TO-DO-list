import { Controller, Get } from '@nestjs/common';

@Controller()
export class WelcomeController {
  @Get('/')
  welcome(): string {
    return 'Welcome to the Todo App API!';
  }
}
