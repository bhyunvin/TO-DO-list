import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Session,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Ip,
} from '@nestjs/common';
import { TodoService } from './todo.service';
import { SessionData } from 'express-session';
import { CreateTodoDto, UpdateTodoDto, DeleteTodoDto } from './todo.dto';
import { AuthenticatedGuard } from '../../types/express/auth.guard';

@UseGuards(AuthenticatedGuard) // 컨트롤러 전체에 인증 가드 적용
@Controller('todo')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  // 새로운 ToDo 항목을 생성합니다.
  @Post()
  create(
    @Session() session: SessionData,
    @Body() createTodoDto: CreateTodoDto,
    @Ip() ip: string,
  ) {
    return this.todoService.create(session.user, ip, createTodoDto);
  }

  // 특정 날짜의 모든 ToDo 항목을 조회합니다.
  @Get()
  findAll(
    @Session() session: SessionData, @Query('date') date: string) {
    return this.todoService.findAll(session.user.userSeq, date);
  }

  // 특정 ToDo 항목을 수정합니다.
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Session() session: SessionData,
    @Ip() ip: string,
    @Body() updateTodoDto: UpdateTodoDto,
  ) {
    return this.todoService.update(
      Number(id),
      session.user,
      ip,
      updateTodoDto,
    );
  }

  // 여러 ToDo 항목을 삭제합니다.
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT) // 성공적으로 삭제되었을 때 204 No Content를 반환합니다.
  remove(
    @Session() session: SessionData,
    @Ip() ip: string,
    @Body() deleteTodoDto: DeleteTodoDto,
  ) {
    return this.todoService.delete(session.user, ip, deleteTodoDto.todoIds);
  }
}
