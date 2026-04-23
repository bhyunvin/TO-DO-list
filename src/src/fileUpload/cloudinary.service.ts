import {
  UploadApiErrorResponse,
  UploadApiResponse,
  v2 as cloudinary,
} from 'cloudinary';
import { env } from '../plugins/config';
import { Logger } from '../utils/logger';

// 모듈 로드 시 1회 전역 초기화
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export class CloudinaryService {
  private readonly logger = new Logger('CloudinaryService');

  /**
   * 파일을 Cloudinary에 업로드
   * Bun 환경의 스트림 호환성 문제를 피하기 위해 Base64 방식을 사용합니다.
   *
   * @param file 업로드할 파일 (Standard File object)
   * @returns 업로드 결과
   */
  async uploadFile(file: File): Promise<UploadApiResponse> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

      // uploader.upload는 성공 시 UploadApiResponse를 반환합니다.
      return await cloudinary.uploader.upload(base64, {
        resource_type: 'auto',
      });
    } catch (error) {
      const apiError = error as UploadApiErrorResponse;
      this.logger.error(
        'Cloudinary upload failed',
        apiError.message || String(error),
      );
      throw new Error(apiError.message || 'Upload failed');
    }
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
  ): Promise<unknown> {
    try {
      return await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
    } catch (error) {
      this.logger.error('Cloudinary delete failed', String(error));
      throw error;
    }
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
      const regex = /\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/;
      const match = regex.exec(pathname);
      return match ? match[1] : '';
    } catch (error) {
      this.logger.error('public_id 추출 실패', String(error));
      return '';
    }
  }
}
