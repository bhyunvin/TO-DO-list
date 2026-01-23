import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

/**
 * JWT 인증을 사용하여 이미지를 안전하게 로드하는 커스텀 훅.
 * 로딩에 실패하거나 필요하지 않은 경우 원본 src를 반환합니다.
 * @param {string} src - 이미지 소스 URL
 * @returns {string} - blob URL 또는 원본 src
 */
const useSecureImage = (src) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [prevSrc, setPrevSrc] = useState(src);

  // Props 변경 감지: 렌더링 중 blobUrl 즉시 초기화
  if (src !== prevSrc) {
    setPrevSrc(src);
    setBlobUrl(null);
  }

  useEffect(() => {
    // 로컬 API 파일 요청만 인터셉트
    if (src?.startsWith('/api/file/') && !src.startsWith('http')) {
      let isMounted = true;
      let objectUrl = null;

      const fetchImage = async () => {
        try {
          const response = await apiClient.get(src, { responseType: 'blob' });
          const blob = response.data || response; // axios wraps response, raw fetch might not
          if (isMounted) {
            objectUrl = URL.createObjectURL(blob as Blob);
            setBlobUrl(objectUrl);
          }
        } catch (error) {
          console.error('Failed to load secure image:', error);
          // 인증된 요청 실패 시 원본 src 사용 (반환값으로 처리됨)
        }
      };

      fetchImage();

      return () => {
        isMounted = false;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }
  }, [src]);

  return blobUrl || src;
};

export default useSecureImage;
