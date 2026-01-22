import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFiles,
  Res,
  Req,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Ip,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { TodoService } from './todo.service';
import {
  CreateTodoDto,
  UpdateTodoDto,
  CreateTodoWithFilesDto,
  UpdateTodoWithFilesDto,
  SearchTodoDto,
} from './todo.dto';
import { AuthenticatedGuard } from '../types/express/auth.guard';
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

  @Post()
  create(
    @Req() req: Request,
    @Body() createTodoDto: CreateTodoDto,
    @Ip() ip: string,
  ) {
    const user = req.user as any;
    return this.todoService.create(user, ip, createTodoDto);
  }

  @Get()
  findAll(@Req() req: Request, @Query('date') date: string) {
    const user = req.user as any;
    return this.todoService.findAll(user.userSeq, date);
  }

  @Get('search')
  async search(@Req() req: Request, @Query() query: SearchTodoDto) {
    const user = req.user as any;
    return this.todoService.search(
      user.userSeq,
      query.startDate,
      query.endDate,
      query.keyword,
    );
  }

  @Get('excel')
  async exportToExcel(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    try {
      // JWT에서 userSeq 추출
      const user = req.user as any;
      const { userSeq } = user;

      // Excel 파일 생성 (검증은 서비스 레이어에서 수행)
      const buffer = await this.todoService.exportToExcel(
        userSeq,
        startDate,
        endDate,
      );

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
      const user = req.user as any;
      this.logger.error('엑셀 내보내기 실패', {
        userId: user?.userSeq,
        startDate,
        endDate,
        error: error.message,
      });
      throw error;
    }
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() req: Request,
    @Ip() ip: string,
    @Body() updateTodoDto: UpdateTodoDto,
  ) {
    const user = req.user as any;
    return this.todoService.update(Number(id), user, ip, updateTodoDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: Request, @Ip() ip: string) {
    const user = req.user as any;
    return this.todoService.delete(user, ip, Number(id));
  }

  // 할 일 파일 첨부 업로드 엔드포인트
  @Post('upload-attachments')
  @UseInterceptors(
    FilesInterceptor('files', 10, todoAttachmentMulterOptions),
    TodoAttachmentValidationInterceptor,
  )
  async uploadAttachments(
    @Req() req: Request,
    @UploadedFiles() files: Express.Multer.File[],
    @Ip() ip: string,
  ) {
    try {
      const user = req.user as any;
      const result = await this.todoService.uploadAttachments(user, ip, files);

      // 성공적인 업로드 로그 기록
      const errorContext = this.fileUploadErrorService.extractErrorContext(
        {
          ip,
          get: () => '',
          headers: {},
          method: 'POST',
          path: '/todo/upload-attachments',
        } as any,
        'todo_attachment',
        user.userSeq,
      );

      this.fileUploadErrorService.logSuccessfulUpload(
        files.map((f) => ({
          originalFileName: f.originalname,
          fileSize: f.size,
        })),
        errorContext,
      );

      return this.fileUploadErrorService.createSuccessResponse(
        Array.isArray(result) ? result : [result],
        `${files.length}개의 첨부파일이 성공적으로 업로드되었습니다`,
        errorContext.requestId,
      );
    } catch (error) {
      const user = req.user as any;
      this.logger.error('TODO 첨부파일 업로드 실패', {
        userId: user?.userSeq,
        error: error.message,
        fileCount: files?.length || 0,
      });
      throw error;
    }
  }

  @Post('with-files')
  @UseInterceptors(
    FilesInterceptor('files', 10, todoAttachmentMulterOptions),
    TodoAttachmentValidationInterceptor,
  )
  async createWithFiles(
    @Req() req: Request,
    @Body() createTodoDto: CreateTodoWithFilesDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Ip() ip: string,
  ) {
    try {
      const user = req.user as any;
      const result = await this.todoService.createWithFiles(
        user,
        ip,
        createTodoDto,
        files,
      );

      // 파일과 함께 성공적인 생성 로그 기록
      if (files && files.length > 0) {
        const errorContext = this.fileUploadErrorService.extractErrorContext(
          {
            ip,
            get: () => '',
            headers: {},
            method: 'POST',
            path: '/todo/with-files',
          } as any,
          'todo_attachment',
          user.userSeq,
        );

        this.fileUploadErrorService.logSuccessfulUpload(
          files.map((f) => ({
            originalFileName: f.originalname,
            fileSize: f.size,
          })),
          errorContext,
        );
      }

      return result;
    } catch (error) {
      const user = req.user as any;
      this.logger.error('파일을 포함한 TODO 생성 실패', {
        userId: user.userSeq,
        error: error.message,
        fileCount: files?.length || 0,
      });
      throw error;
    }
  }
  @Patch('with-files/:id')
  @UseInterceptors(
    FilesInterceptor('files', 10, todoAttachmentMulterOptions),
    TodoAttachmentValidationInterceptor,
  )
  async updateWithFiles(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() updateTodoDto: UpdateTodoWithFilesDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Ip() ip: string,
  ) {
    try {
      const user = req.user as any;
      const result = await this.todoService.updateWithFiles(
        Number(id),
        user,
        ip,
        updateTodoDto,
        files,
      );

      // 파일과 함께 성공적인 수정 로그 기록
      if (files && files.length > 0) {
        const errorContext = this.fileUploadErrorService.extractErrorContext(
          {
            ip,
            get: () => '',
            headers: {},
            method: 'PATCH',
            path: `/todo/with-files/${id}`,
          } as any,
          'todo_attachment',
          user.userSeq,
        );

        this.fileUploadErrorService.logSuccessfulUpload(
          files.map((f) => ({
            originalFileName: f.originalname,
            fileSize: f.size,
          })),
          errorContext,
        );
      }

      return result;
    } catch (error) {
      const user = req.user as any;
      this.logger.error('파일을 포함한 TODO 수정 실패', {
        userId: user.userSeq,
        todoId: id,
        error: error.message,
        fileCount: files?.length || 0,
      });
      throw error;
    }
  }

  @Post(':id/attachments')
  @UseInterceptors(
    FilesInterceptor('files', 10, todoAttachmentMulterOptions),
    TodoAttachmentValidationInterceptor,
  )
  async addAttachments(
    @Param('id') id: string,
    @Req() req: Request,
    @UploadedFiles() files: Express.Multer.File[],
    @Ip() ip: string,
  ) {
    try {
      const user = req.user as any;
      const result = await this.todoService.addAttachments(
        Number(id),
        user,
        ip,
        files,
      );

      // 성공적인 첨부 파일 추가 로그 기록
      const errorContext = this.fileUploadErrorService.extractErrorContext(
        {
          ip,
          get: () => '',
          headers: {},
          method: 'POST',
          path: `/todo/${id}/attachments`,
        } as any,
        'todo_attachment',
        user.userSeq,
      );

      this.fileUploadErrorService.logSuccessfulUpload(
        files.map((f) => ({
          originalFileName: f.originalname,
          fileSize: f.size,
        })),
        errorContext,
      );

      return this.fileUploadErrorService.createSuccessResponse(
        Array.isArray(result) ? result : [result],
        `할 일(ID: ${id})에 ${files.length}개의 첨부파일이 성공적으로 추가되었습니다`,
        errorContext.requestId,
      );
    } catch (error) {
      const user = req.user as any;
      this.logger.error('TODO 첨부파일 추가 실패', {
        todoId: id,
        userId: user.userSeq,
        error: error.message,
        fileCount: files?.length || 0,
      });
      throw error;
    }
  }

  @Get(':id/attachments')
  getAttachments(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as any;
    return this.todoService.getAttachments(Number(id), user.userSeq);
  }

  @Delete(':id/attachments/:fileNo')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAttachment(
    @Param('id') id: string,
    @Param('fileNo') fileNo: string,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    await this.todoService.deleteAttachment(user, Number(id), Number(fileNo));
  }
}
