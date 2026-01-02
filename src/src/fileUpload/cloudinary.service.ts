import { Injectable } from '@nestjs/common';
import {
  UploadApiErrorResponse,
  UploadApiResponse,
  v2 as cloudinary,
} from 'cloudinary';
import * as toStream from 'buffer-to-stream';

@Injectable()
export class CloudinaryService {
  async uploadFile(
    file: Express.Multer.File,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { resource_type: 'auto' }, // 이미지, 문서 등 자동 감지
        (error, result) => {
          if (error) return reject(new Error(error.message));
          resolve(result);
        },
      );
      toStream(file.buffer).pipe(upload);
    });
  }

  async deleteFile(
    publicId: string,
    resourceType: string = 'image',
  ): Promise<any> {
    return cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  }
}
