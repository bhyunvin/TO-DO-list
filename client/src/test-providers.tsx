import React from 'react';

// 기본 테스트용 사용자 데이터
export const mockUser = {
  userId: 'testuser',
  userName: 'Test User',
  userSeq: 1,
};

/**
 * 테스트를 위한 간단한 Provider Wrapper
 * 실제 스토어의 로직보다는 모킹된 상태를 주입하는 역할
 */
export const TestProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <>{children}</>;
};
