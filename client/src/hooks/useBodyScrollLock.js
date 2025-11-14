import { useEffect } from 'react';

/**
 * body 스크롤을 잠그거나 해제하는 커스텀 훅
 * 모달이 열려 있을 때 메인 페이지가 스크롤되는 것을 방지합니다
 */
export const useBodyScrollLock = (isLocked) => {
  useEffect(() => {
    if (isLocked) {
      // 원래 overflow 값 저장
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      
      // 레이아웃 이동을 방지하기 위해 스크롤바 너비 계산
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      // body 스크롤 잠금
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      
      // 정리 함수
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [isLocked]);
};