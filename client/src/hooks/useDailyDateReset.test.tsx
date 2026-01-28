import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useDailyDateReset from './useDailyDateReset';
import * as alertUtils from '../utils/alertUtils';

vi.mock('../utils/alertUtils', () => ({
  showToast: vi.fn(),
}));

describe('useDailyDateReset', () => {
  const handleTodayForTest = vi.fn();
  let dateNowSpy: ReturnType<typeof vi.spyOn>;

  // Date.now()를 mocking하는 helper 함수
  const mockDateNow = (dateString: string) => {
    const mockTime = new Date(dateString).getTime();
    dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(mockTime);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    if (dateNowSpy) {
      dateNowSpy.mockRestore();
    }
  });

  it('should reset date to today and show toast if accessing for the first time today', () => {
    // 현재 시간을 2025-01-01로 설정
    mockDateNow('2025-01-01T10:00:00');

    const yesterday = new Date('2024-12-31T10:00:00');

    renderHook(() => useDailyDateReset(yesterday, handleTodayForTest));

    expect(handleTodayForTest).toHaveBeenCalledTimes(1);
    expect(alertUtils.showToast).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('lastDailyReset')).toBe('2025-01-01');
  });

  it('should not reset date if already accessing today', () => {
    // 현재 시간을 2025-01-01로 설정
    mockDateNow('2025-01-01T10:00:00');

    const today = new Date('2025-01-01T10:00:00');

    // localStorage 설정을 위한 첫 렌더링
    localStorage.setItem('lastDailyReset', '2025-01-01');

    renderHook(() => useDailyDateReset(today, handleTodayForTest));

    expect(handleTodayForTest).not.toHaveBeenCalled();
    expect(alertUtils.showToast).not.toHaveBeenCalled();
  });

  it('should trigger reset on visibility change if new day comes', () => {
    // 초기 시간을 2025-01-01로 설정
    mockDateNow('2025-01-01T10:00:00');

    const todayInitial = new Date('2025-01-01T10:00:00');
    // 설정: 사용자가 어제 방문함
    localStorage.setItem('lastDailyReset', '2024-12-31');

    const { unmount } = renderHook(() =>
      useDailyDateReset(todayInitial, handleTodayForTest),
    );

    expect(localStorage.getItem('lastDailyReset')).toBe('2025-01-01');
    expect(handleTodayForTest).not.toHaveBeenCalled();

    // 이제 시간이 흘러 2025-01-02가 됨
    mockDateNow('2025-01-02T10:00:00');

    // 탭 활성화 (visibility change)
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(handleTodayForTest).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('lastDailyReset')).toBe('2025-01-02');

    unmount();
  });
});
