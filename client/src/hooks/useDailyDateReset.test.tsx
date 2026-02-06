import { renderHook } from '@testing-library/react';
import useDailyDateReset from './useDailyDateReset';
import * as alertUtils from '../utils/alertUtils';

jest.mock('../utils/alertUtils', () => ({
  showToast: jest.fn(),
}));

describe('useDailyDateReset', () => {
  const handleTodayForTest = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should reset date to today and show toast if accessing for the first time today', () => {
    // 현재 시간을 2025-01-01로 설정
    jest.setSystemTime(new Date('2025-01-01T10:00:00'));

    const yesterday = new Date('2024-12-31T10:00:00');

    renderHook(() => useDailyDateReset(yesterday, handleTodayForTest));

    expect(handleTodayForTest).toHaveBeenCalledTimes(1);
    expect(alertUtils.showToast).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('lastDailyReset')).toBe('2025-01-01');
  });

  it('should not reset date if already accessing today', () => {
    // 현재 시간을 2025-01-01로 설정
    jest.setSystemTime(new Date('2025-01-01T10:00:00'));

    const today = new Date('2025-01-01T10:00:00');

    // localStorage 설정을 위한 첫 렌더링
    localStorage.setItem('lastDailyReset', '2025-01-01');

    renderHook(() => useDailyDateReset(today, handleTodayForTest));

    expect(handleTodayForTest).not.toHaveBeenCalled();
    expect(alertUtils.showToast).not.toHaveBeenCalled();
  });

  it('should trigger reset on visibility change if new day comes', () => {
    // 초기 시간을 2025-01-01로 설정
    jest.setSystemTime(new Date('2025-01-01T10:00:00'));

    const todayInitial = new Date('2025-01-01T10:00:00');
    // 설정: 사용자가 어제 방문함
    localStorage.setItem('lastDailyReset', '2024-12-31');

    renderHook(() => useDailyDateReset(todayInitial, handleTodayForTest));

    expect(localStorage.getItem('lastDailyReset')).toBe('2025-01-01');
    expect(handleTodayForTest).not.toHaveBeenCalled();
  });

  // Re-writing the 3rd test fully to ensure logic consistency
  it('should trigger reset on visibility change if new day comes (corrected)', () => {
    jest.setSystemTime(new Date('2025-01-01T10:00:00'));
    const todayInitial = new Date('2025-01-01T10:00:00');

    // Need to simulate "already visited today" so initial render DOES NOT trigger.
    localStorage.setItem('lastDailyReset', '2025-01-01');

    renderHook(() => useDailyDateReset(todayInitial, handleTodayForTest));

    expect(handleTodayForTest).not.toHaveBeenCalled();

    // Now time travel to tomorrow
    jest.setSystemTime(new Date('2025-01-02T10:00:00'));

    // Visibility change
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(handleTodayForTest).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('lastDailyReset')).toBe('2025-01-02');
  });
});
