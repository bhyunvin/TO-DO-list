import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileInfoEntity } from './file.entity';
import { AuthenticatedGuard } from '../types/express/auth.guard';
import { existsSync } from 'node:fs';
import { TodoEntity } from '../todo/todo.entity';
import { UserEntity } from '../user/user.entity';

@Controller('file')
export class FileController {
  constructor(
    @InjectRepository(FileInfoEntity)
    private readonly fileInfoRepository: Repository<FileInfoEntity>,
    @InjectRepository(TodoEntity)
    private readonly todoRepository: Repository<TodoEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  @Get(':fileNo')
  @UseGuards(AuthenticatedGuard)
  async getFile(
    @Param('fileNo') fileNo: number,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = req.user as any;
    const fileInfo = await this.fileInfoRepository.findOne({
      where: { fileNo },
    });

    if (!fileInfo) {
      throw new NotFoundException('파일을 찾을 수 없습니다.');
    }

    // 파일 접근 권한 확인 (할 일 파일 또는 프로필 이미지)
    const hasTodoAccess = await this.todoRepository.count({
      where: {
        todoFileGroupNo: fileInfo.fileGroupNo,
        userSeq: user.userSeq,
      },
    });

    const hasProfileAccess = await this.userRepository.count({
      where: {
        userProfileImageFileGroupNo: fileInfo.fileGroupNo,
        userSeq: user.userSeq,
      },
    });

    if (hasTodoAccess === 0 && hasProfileAccess === 0) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    const filePath = fileInfo.filePath;

    // Cloudinary URL인 경우 리다이렉트
    if (filePath?.startsWith('http')) {
      return res.redirect(filePath);
    }

    if (!existsSync(filePath)) {
      throw new NotFoundException('파일이 서버에 존재하지 않습니다.');
    }

    // 로컬 파일 전송 (기존 데이터 호환성용)
    res.sendFile(filePath);
  }
}
