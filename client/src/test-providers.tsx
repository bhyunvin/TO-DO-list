import React from 'react';

/**
 * 테스트를 위한 간단한 Provider Wrapper
 * 실제 스토어의 로직보다는 모킹된 상태를 주입하는 역할
 */
export const TestProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <>{children}</>;
};
