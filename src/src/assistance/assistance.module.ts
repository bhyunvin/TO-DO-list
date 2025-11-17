import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { AssistanceService } from './assistance.service';
import { HttpModule } from '@nestjs/axios';
import { TodoModule } from '../todo/todo.module';

@Module({
  imports: [HttpModule, TodoModule],
  controllers: [ChatController],
  providers: [AssistanceService],
})
export class AssistanceModule {}
