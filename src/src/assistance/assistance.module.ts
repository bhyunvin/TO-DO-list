import { Module } from '@nestjs/common';
import { AssistanceController } from './assistance.controller';
import { AssistanceService } from './assistance.service';
import { HttpModule } from '@nestjs/axios';
import { KeychainModule } from '../utils/keychain.module';

@Module({
  imports: [HttpModule, KeychainModule],
  controllers: [AssistanceController],
  providers: [AssistanceService],
})
export class AssistanceModule {}
