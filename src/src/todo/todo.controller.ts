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
  Logger,
  UseGuards,
  Ip,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { TodoService } from './todo.service';
import { SessionData } from 'express-session';
import { CreateTodoDto, UpdateTodoDto, DeleteTodoDto, CreateTodoWithFilesDto } from './todo.dto';
import { AuthenticatedGuard } from '../../types/express/auth.guard';
import { TodoAttachmentValidationInterceptor } from '../fileUpload/validation/file-validation.interceptor';
import { todoAttachmentMulterOptions } from '../fileUpload/fileUploadUtil';

@UseGuards(AuthenticatedGuard) // 컨트롤러 전체에 인증 가드 적용
@Controller('todo')
export class TodoController {
  private readonly logger = new Logger(TodoController.name);

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
  findAll(@Session() session: SessionData, @Query('date') date: string) {
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
    return this.todoService.update(Number(id), session.user, ip, updateTodoDto);
  }

  // 특정 ToDo 항목을 삭제합니다.
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // 성공적으로 삭제되었을 때 204 No Content를 반환합니다.
  remove(
    @Param('id') id: string,
    @Session() session: SessionData,
    @Ip() ip: string,
  ) {
    return this.todoService.delete(session.user, ip, Number(id));
  }

  // TODO 파일 첨부 업로드 엔드포인트
  @Post('upload-attachments')
  @UseInterceptors(
    FilesInterceptor('files', 10, todoAttachmentMulterOptions),
    TodoAttachmentValidationInterceptor,
  )
  uploadAttachments(
    @Session() session: SessionData,
    @UploadedFiles() files: Express.Multer.File[],
    @Ip() ip: string,
  ) {
    return this.todoService.uploadAttachments(session.user, ip, files);
  }

  // 파일과 함께 새로운 TODO 항목을 생성합니다.
  @Post('with-files')
  @UseInterceptors(
    FilesInterceptor('files', 10, todoAttachmentMulterOptions),
    TodoAttachmentValidationInterceptor,
  )
  createWithFiles(
    @Session() session: SessionData,
    @Body() createTodoDto: CreateTodoWithFilesDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Ip() ip: string,
  ) {
    return this.todoService.createWithFiles(session.user, ip, createTodoDto, files);
  }

  // 기존 TODO 항목에 파일을 추가합니다.
  @Post(':id/attachments')
  @UseInterceptors(
    FilesInterceptor('files', 10, todoAttachmentMulterOptions),
    TodoAttachmentValidationInterceptor,
  )
  addAttachments(
    @Param('id') id: string,
    @Session() session: SessionData,
    @UploadedFiles() files: Express.Multer.File[],
    @Ip() ip: string,
  ) {
    return this.todoService.addAttachments(Number(id), session.user, ip, files);
  }

  // TODO 항목의 첨부 파일 목록을 조회합니다.
  @Get(':id/attachments')
  getAttachments(
    @Param('id') id: string,
    @Session() session: SessionData,
  ) {
    return this.todoService.getAttachments(Number(id), session.user.userSeq);
  }
}
