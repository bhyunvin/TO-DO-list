import {
  UploadApiErrorResponse,
  UploadApiResponse,
  v2 as cloudinary,
} from 'cloudinary';
import toStream from 'buffer-to-stream';

// Cloudinary 설정 초기화 (한 번만 실행되도록 전역 범위에서 설정하거나 생성자에서 확인)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

import { Logger } from '../utils/logger';

export class CloudinaryService {
  private readonly logger = new Logger('CloudinaryService');
  /**
   * 파일을 Cloudinary에 업로드
   * @param file 업로드할 파일 (Standard File object)
   * @returns 업로드 결과
   */
  async uploadFile(
    file: File,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { resource_type: 'auto' }, // 이미지, 문서 등 자동 감지
        (error, result) => {
          if (error) return reject(new Error(error.message));
          if (!result) return reject(new Error('Upload failed'));
          resolve(result);
        },
      );
      toStream(buffer).pipe(upload);
    });
  }

  /**
   * Cloudinary에서 파일 삭제
   * @param publicId 삭제할 파일의 public_id
   * @param resourceType 삭제할 파일의 resource_type
   * @returns 삭제 결과
   */
  async deleteFile(
    publicId: string,
    resourceType: string = 'image',
  ): Promise<any> {
    return cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  }

  /**
   * URL에서 public_id 추출
   * @param url Cloudinary URL
   * @returns public_id
   */
  extractPublicIdFromUrl(url: string): string {
    try {
      const { pathname } = new URL(url);
      // '/upload/' 이후의 경로 캡처 (버전 'v1234/'는 무시)
      // 예: /.../upload/v12345/folder/filename.jpg -> folder/filename
      const regex = /\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/;
      const match = regex.exec(pathname);
      return match ? match[1] : '';
    } catch (error) {
      this.logger.error('public_id 추출 실패', String(error));
      return '';
    }
  }
}
