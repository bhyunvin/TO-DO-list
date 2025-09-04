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
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { TodoService } from './todo.service';
import { CreateTodoDto, UpdateTodoDto, DeleteTodoDto } from './todo.dto';

@Controller('todo')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  // 새로운 ToDo 항목을 생성합니다.
  @Post()
  create(
    @Session() session: Record<string, any>,
    @Body() createTodoDto: CreateTodoDto,
    @Req() req: Request,
  ) {
    const { userSeq, userId } = session.user;
    return this.todoService.create(userSeq, createTodoDto, userId, req.ip);
  }

  // 특정 날짜의 모든 ToDo 항목을 조회합니다.
  @Get()
  findAll(
    @Session() session: Record<string, any>,
    @Query('date') date: string,
  ) {
    const { userSeq } = session.user;
    return this.todoService.findAll(userSeq, date);
  }

  // 특정 ToDo 항목을 수정합니다.
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Session() session: Record<string, any>,
    @Body() updateTodoDto: UpdateTodoDto,
    @Req() req: Request,
  ) {
    const { userSeq, userId } = session.user;
    return this.todoService.update(+id, userSeq, updateTodoDto, userId, req.ip);
  }

  // 여러 ToDo 항목을 삭제합니다.
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT) // 성공적으로 삭제되었을 때 204 No Content를 반환합니다.
  remove(
    @Session() session: Record<string, any>,
    @Body() deleteTodoDto: DeleteTodoDto,
    @Req() req: Request,
  ) {
    const { userSeq, userId } = session.user;
    return this.todoService.delete(userSeq, deleteTodoDto.todoIds, userId, req.ip);
  }
}
