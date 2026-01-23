import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useDailyDateReset from './useDailyDateReset';
import * as alertUtils from '../utils/alertUtils';

vi.mock('../utils/alertUtils', () => ({
  showToast: vi.fn(),
}));

describe('useDailyDateReset', () => {
  const handleTodayForTest = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Date 객체 모킹 (고정된 시간 설정)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should reset date to today and show toast if accessing for the first time today', () => {
    const yesterday = new Date('2024-12-31T10:00:00');

    renderHook(() => useDailyDateReset(yesterday, handleTodayForTest));

    expect(handleTodayForTest).toHaveBeenCalledTimes(1);
    expect(alertUtils.showToast).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('lastDailyReset')).toBe('2025-01-01');
  });

  it('should not reset date if already accessing today', () => {
    const today = new Date('2025-01-01T10:00:00');

    // localStorage 설정을 위한 첫 렌더링
    localStorage.setItem('lastDailyReset', '2025-01-01');

    renderHook(() => useDailyDateReset(today, handleTodayForTest));

    expect(handleTodayForTest).not.toHaveBeenCalled();
    expect(alertUtils.showToast).not.toHaveBeenCalled();
  });

  it('should trigger reset on visibility change if new day comes', () => {
    const todayInitial = new Date('2025-01-01T10:00:00');
    // 설정: 사용자가 어제 방문함
    localStorage.setItem('lastDailyReset', '2024-12-31');

    const { unmount } = renderHook(() =>
      useDailyDateReset(todayInitial, handleTodayForTest),
    );

    // 초기 체크 (2025-01-01에 페이지 로드 시뮬레이션) -> 대기, 훅 내부 로직이 현재 시간을 체크함.
    // 테스트 설정에서 "현재"는 2025-01-01임.
    // 따라서 selectedDate로 "2025-01-01"을 전달하면 selectedDate가 오늘과 같으므로 handleToday가 호출되지 않음.
    // 하지만 localStorage는 업데이트되어야 함.

    expect(localStorage.getItem('lastDailyReset')).toBe('2025-01-01');
    expect(handleTodayForTest).not.toHaveBeenCalled(); // selectedDate가 오늘과 일치하므로 호출되지 않음

    // 이제 "수면 모드" 시뮬레이션 ... 시간이 흘러 2025-01-02가 됨
    vi.setSystemTime(new Date('2025-01-02T10:00:00'));

    // 탭 활성화 (visibility change)
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(handleTodayForTest).toHaveBeenCalledTimes(1); // selectedDate (2025-01-01) != 새로운 오늘 (2025-01-02) 이므로 handleToday 호출되어야 함
    expect(localStorage.getItem('lastDailyReset')).toBe('2025-01-02');

    unmount();
  });
});
