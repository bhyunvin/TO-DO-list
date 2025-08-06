import { diskStorage } from 'multer';
import { extname } from 'path';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileInfoEntity } from './file.entity';

import { AuditSettings, setAuditColumn } from '../utils/auditColumns';

const uploadFileDirectory = process.env.UPLOAD_FILE_DIRECTORY;

@Injectable()
export class FileUploadUtil {
  constructor(
    @InjectRepository(FileInfoEntity)
    private readonly fileInfoRepository: Repository<FileInfoEntity>,
  ) {}

  // 파일 정보를 DB에 저장하는 함수
  async saveFileInfo(
    files: Express.Multer.File[],
    setting: AuditSettings,
  ): Promise<{ savedFiles: FileInfoEntity[]; fileGroupNo: number }> {
    const savedFiles: FileInfoEntity[] = [];
    let fileGroupNo: number | null = null;

    if (files.length > 0) {
      // 첫 번째 파일을 DB에 저장하여 fileGroupNo를 설정합니다.
      const firstFile = files[0];
      let newFirstFile = this.fileInfoRepository.create({
        filePath: firstFile.path,
        saveFileName: firstFile.filename,
        fileExt: extname(firstFile.originalname).substring(1),
        fileSize: firstFile.size,
      });

      setting.entity = newFirstFile;
      newFirstFile = setAuditColumn(setting);

      const savedFirstFile = await this.fileInfoRepository.save(newFirstFile);
      fileGroupNo = savedFirstFile.fileNo; // 첫 번째 파일의 fileNo를 fileGroupNo로 설정

      // 첫 번째 파일의 fileGroupNo를 기준으로 업데이트합니다.
      await this.fileInfoRepository.update(
        { fileNo: fileGroupNo },
        { fileGroupNo: fileGroupNo },
      );

      // 첫 번째 파일을 savedFiles에 추가합니다.
      savedFiles.push(savedFirstFile);
    }

    if (files.length > 1) {
      // 나머지 파일들을 DB에 저장합니다.
      for (let i = 1; i < files.length; i++) {
        const file = files[i];
        let newFile = this.fileInfoRepository.create({
          fileGroupNo: fileGroupNo, // 모든 파일에 같은 fileGroupNo 설정
          filePath: file.path,
          saveFileName: file.filename,
          fileExt: extname(file.originalname).substring(1),
          fileSize: file.size,
        });

        setting.entity = newFile;
        newFile = setAuditColumn(setting);

        const savedFile = await this.fileInfoRepository.save(newFile);
        savedFiles.push(savedFile);
      }
    }

    return { savedFiles, fileGroupNo };
  }
}

// Multer 옵션 설정
export const multerOptions = {
  storage: diskStorage({
    destination: uploadFileDirectory,
    filename: (req, file, callback) => {
      const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      const filename = `${file.fieldname}_${uniqueSuffix}${ext}`;
      callback(null, filename);
    },
  }),
};
