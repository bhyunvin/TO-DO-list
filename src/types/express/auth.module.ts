import { Module } from '@nestjs/common';
import { AuthenticatedGuard } from './auth.guard';

@Module({
  providers: [AuthenticatedGuard],
  exports: [AuthenticatedGuard],
})
export class AuthModule {}