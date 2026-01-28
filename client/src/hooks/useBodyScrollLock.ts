import { useEffect } from 'react';

/**
 * body 스크롤을 잠그거나 해제하는 커스텀 훅
 * 모달이 열려 있을 때 메인 페이지가 스크롤되는 것을 방지합니다
 */
export const useBodyScrollLock = (isLocked) => {
  useEffect(() => {
    if (isLocked) {
      const { overflow: originalOverflow, paddingRight: originalPaddingRight } =
        document.body.style;

      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;

      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [isLocked]);
};
