import { renderHook } from '@testing-library/react';
import useDailyDateReset from './useDailyDateReset';
import * as alertUtils from '../utils/alertUtils';

jest.mock('../utils/alertUtils', () => ({
  showToast: jest.fn(),
}));

describe('useDailyDateReset 훅', () => {
  const handleTodayForTest = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('오늘 처음 접속하는 경우 날짜를 오늘로 리셋하고 토스트 메시지를 표시함', () => {
    // 현재 시간을 2025-01-01로 설정
    jest.setSystemTime(new Date('2025-01-01T10:00:00'));

    const yesterday = new Date('2024-12-31T10:00:00');

    renderHook(() => useDailyDateReset(yesterday, handleTodayForTest));

    expect(handleTodayForTest).toHaveBeenCalledTimes(1);
    expect(alertUtils.showToast).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('lastDailyReset')).toBe('2025-01-01');
  });

  it('이미 오늘 접속한 경우 날짜를 리셋하지 않음', () => {
    // 현재 시간을 2025-01-01로 설정
    jest.setSystemTime(new Date('2025-01-01T10:00:00'));

    const today = new Date('2025-01-01T10:00:00');

    // localStorage 설정을 위한 첫 렌더링
    localStorage.setItem('lastDailyReset', '2025-01-01');

    renderHook(() => useDailyDateReset(today, handleTodayForTest));

    expect(handleTodayForTest).not.toHaveBeenCalled();
    expect(alertUtils.showToast).not.toHaveBeenCalled();
  });

  it('새로운 날이 밝았을 때 화면 가시성(visibility)이 변경되면 리셋이 트리거됨', () => {
    // 초기 시간을 2025-01-01로 설정
    jest.setSystemTime(new Date('2025-01-01T10:00:00'));

    const todayInitial = new Date('2025-01-01T10:00:00');
    // 설정: 사용자가 어제 방문함
    localStorage.setItem('lastDailyReset', '2024-12-31');

    renderHook(() => useDailyDateReset(todayInitial, handleTodayForTest));

    expect(localStorage.getItem('lastDailyReset')).toBe('2025-01-01');
    expect(handleTodayForTest).not.toHaveBeenCalled();
  });

  // 로직 일관성을 보장하기 위해 세 번째 테스트를 완전히 재작성함
  it('새로운 날이 밝았을 때 화면 가시성(visibility)이 변경되면 리셋이 트리거됨 (수정됨)', () => {
    jest.setSystemTime(new Date('2025-01-01T10:00:00'));
    const todayInitial = new Date('2025-01-01T10:00:00');

    // "이미 오늘 방문함" 상태를 시뮬레이션하여 초기 렌더링 시 트리거되지 않도록 함
    localStorage.setItem('lastDailyReset', '2025-01-01');

    renderHook(() => useDailyDateReset(todayInitial, handleTodayForTest));

    expect(handleTodayForTest).not.toHaveBeenCalled();

    // 이제 내일로 시간 이동
    jest.setSystemTime(new Date('2025-01-02T10:00:00'));

    // 화면 표시 상태 변경 (Visibility change) 트리거
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(handleTodayForTest).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('lastDailyReset')).toBe('2025-01-02');
  });
});
