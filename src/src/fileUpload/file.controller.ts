import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileInfoEntity } from './file.entity';
import { AuthenticatedGuard } from '../../types/express/auth.guard';
import { existsSync } from 'node:fs';

@Controller('file')
export class FileController {
  constructor(
    @InjectRepository(FileInfoEntity)
    private readonly fileInfoRepository: Repository<FileInfoEntity>,
  ) {}

  @Get(':fileNo')
  @UseGuards(AuthenticatedGuard)
  async getFile(@Param('fileNo') fileNo: number, @Res() res: Response) {
    const fileInfo = await this.fileInfoRepository.findOne({
      where: { fileNo },
    });

    if (!fileInfo) {
      throw new NotFoundException('파일을 찾을 수 없습니다.');
    }

    const filePath = fileInfo.filePath;

    // Cloudinary URL인 경우 리다이렉트
    if (filePath.startsWith('http')) {
      return res.redirect(filePath);
    }

    if (!existsSync(filePath)) {
      throw new NotFoundException('파일이 서버에 존재하지 않습니다.');
    }

    // 로컬 파일 전송 (기존 데이터 호환성용)
    res.sendFile(filePath);
  }
}
