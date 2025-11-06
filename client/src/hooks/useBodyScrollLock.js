import { useEffect } from 'react';

/**
 * Custom hook to lock/unlock body scroll
 * Prevents the main page from scrolling when modal is open
 */
export const useBodyScrollLock = (isLocked) => {
  useEffect(() => {
    if (isLocked) {
      // Store original overflow value
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      
      // Calculate scrollbar width to prevent layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      
      // Cleanup function
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [isLocked]);
};