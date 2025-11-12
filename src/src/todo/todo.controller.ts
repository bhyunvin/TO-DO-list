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
  Res,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Response } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { TodoService } from './todo.service';
import { SessionData } from 'express-session';
import { CreateTodoDto, UpdateTodoDto, DeleteTodoDto, CreateTodoWithFilesDto } from './todo.dto';
import { AuthenticatedGuard } from '../../types/express/auth.guard';
import { TodoAttachmentValidationInterceptor } from '../fileUpload/validation/file-validation.interceptor';
import { FileUploadErrorService } from '../fileUpload/validation/file-upload-error.service';
import { todoAttachmentMulterOptions } from '../fileUpload/fileUploadUtil';

@UseGuards(AuthenticatedGuard) // 컨트롤러 전체에 인증 가드 적용
@Controller('todo')
export class TodoController {
  private readonly logger = new Logger(TodoController.name);

  constructor(
    private readonly todoService: TodoService,
    private readonly fileUploadErrorService: FileUploadErrorService,
  ) {}

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

  // ToDo 항목을 Excel 파일로 내보냅니다.
  @Get('excel')
  async exportToExcel(
    @Session() session: SessionData,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    try {
      // 세션에서 userSeq 추출
      const userSeq = session.user.userSeq;

      // Excel 파일 생성 (검증은 서비스 레이어에서 수행)
      const buffer = await this.todoService.exportToExcel(userSeq, startDate, endDate);

      // 응답 헤더 설정
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="todos_${startDate}_to_${endDate}.xlsx"`,
      );

      // Excel 버퍼를 응답으로 전송
      res.send(buffer);
    } catch (error) {
      this.logger.error('Excel export failed', {
        userId: session.user.userSeq,
        startDate,
        endDate,
        error: error.message,
      });
      throw error;
    }
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
  async uploadAttachments(
    @Session() session: SessionData,
    @UploadedFiles() files: Express.Multer.File[],
    @Ip() ip: string,
  ) {
    try {
      const result = await this.todoService.uploadAttachments(session.user, ip, files);
      
      // Log successful upload
      const errorContext = this.fileUploadErrorService.extractErrorContext(
        { ip, get: () => '', headers: {}, method: 'POST', path: '/todo/upload-attachments' } as any,
        'todo_attachment',
        session.user.userSeq,
      );
      
      this.fileUploadErrorService.logSuccessfulUpload(
        files.map(f => ({ originalFileName: f.originalname, fileSize: f.size })),
        errorContext,
      );
      
      return this.fileUploadErrorService.createSuccessResponse(
        Array.isArray(result) ? result : [result],
        `Successfully uploaded ${files.length} attachment(s)`,
        errorContext.requestId,
      );
    } catch (error) {
      this.logger.error('TODO attachment upload failed', {
        userId: session.user.userSeq,
        error: error.message,
        fileCount: files?.length || 0,
      });
      throw error;
    }
  }

  // 파일과 함께 새로운 TODO 항목을 생성합니다.
  @Post('with-files')
  @UseInterceptors(
    FilesInterceptor('files', 10, todoAttachmentMulterOptions),
    TodoAttachmentValidationInterceptor,
  )
  async createWithFiles(
    @Session() session: SessionData,
    @Body() createTodoDto: CreateTodoWithFilesDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Ip() ip: string,
  ) {
    try {
      const result = await this.todoService.createWithFiles(session.user, ip, createTodoDto, files);
      
      // Log successful creation with files
      if (files && files.length > 0) {
        const errorContext = this.fileUploadErrorService.extractErrorContext(
          { ip, get: () => '', headers: {}, method: 'POST', path: '/todo/with-files' } as any,
          'todo_attachment',
          session.user.userSeq,
        );
        
        this.fileUploadErrorService.logSuccessfulUpload(
          files.map(f => ({ originalFileName: f.originalname, fileSize: f.size })),
          errorContext,
        );
      }
      
      return result;
    } catch (error) {
      this.logger.error('TODO creation with files failed', {
        userId: session.user.userSeq,
        error: error.message,
        fileCount: files?.length || 0,
      });
      throw error;
    }
  }

  // 기존 TODO 항목에 파일을 추가합니다.
  @Post(':id/attachments')
  @UseInterceptors(
    FilesInterceptor('files', 10, todoAttachmentMulterOptions),
    TodoAttachmentValidationInterceptor,
  )
  async addAttachments(
    @Param('id') id: string,
    @Session() session: SessionData,
    @UploadedFiles() files: Express.Multer.File[],
    @Ip() ip: string,
  ) {
    try {
      const result = await this.todoService.addAttachments(Number(id), session.user, ip, files);
      
      // Log successful attachment addition
      const errorContext = this.fileUploadErrorService.extractErrorContext(
        { ip, get: () => '', headers: {}, method: 'POST', path: `/todo/${id}/attachments` } as any,
        'todo_attachment',
        session.user.userSeq,
      );
      
      this.fileUploadErrorService.logSuccessfulUpload(
        files.map(f => ({ originalFileName: f.originalname, fileSize: f.size })),
        errorContext,
      );
      
      return this.fileUploadErrorService.createSuccessResponse(
        Array.isArray(result) ? result : [result],
        `Successfully added ${files.length} attachment(s) to TODO ${id}`,
        errorContext.requestId,
      );
    } catch (error) {
      this.logger.error('TODO attachment addition failed', {
        todoId: id,
        userId: session.user.userSeq,
        error: error.message,
        fileCount: files?.length || 0,
      });
      throw error;
    }
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
