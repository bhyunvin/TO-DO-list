import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { AssistanceService } from './assistance.service';
import { HttpModule } from '@nestjs/axios';
import { TodoModule } from '../todo/todo.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../user/user.entity';

@Module({
  imports: [HttpModule, TodoModule, TypeOrmModule.forFeature([UserEntity])],
  controllers: [ChatController],
  providers: [AssistanceService],
})
export class AssistanceModule {}
