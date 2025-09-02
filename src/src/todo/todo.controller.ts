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
} from '@nestjs/common';
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
  ) {
    const userSeq = session.user.userSeq;
    return this.todoService.create(userSeq, createTodoDto);
  }

  // 특정 날짜의 모든 ToDo 항목을 조회합니다.
  @Get()
  findAll(
    @Session() session: Record<string, any>,
    @Query('date') date: string,
  ) {
    const userSeq = session.user.userSeq;
    return this.todoService.findAll(userSeq, date);
  }

  // 특정 ToDo 항목을 수정합니다.
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Session() session: Record<string, any>,
    @Body() updateTodoDto: UpdateTodoDto,
  ) {
    const userSeq = session.user.userSeq;
    return this.todoService.update(+id, userSeq, updateTodoDto);
  }

  // 여러 ToDo 항목을 삭제합니다.
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT) // 성공적으로 삭제되었을 때 204 No Content를 반환합니다.
  remove(
    @Session() session: Record<string, any>,
    @Body() deleteTodoDto: DeleteTodoDto,
  ) {
    const userSeq = session.user.userSeq;
    return this.todoService.delete(userSeq, deleteTodoDto.todoIds);
  }
}
