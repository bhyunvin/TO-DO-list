import { Module } from '@nestjs/common';
import { AssistanceController } from './assistance.controller';
import { ChatController } from './chat.controller';
import { AssistanceService } from './assistance.service';
import { HttpModule } from '@nestjs/axios';
import { KeychainModule } from '../utils/keychain.module';
import { TodoModule } from '../todo/todo.module';

@Module({
  imports: [HttpModule, KeychainModule, TodoModule],
  controllers: [AssistanceController, ChatController],
  providers: [AssistanceService],
})
export class AssistanceModule {}
