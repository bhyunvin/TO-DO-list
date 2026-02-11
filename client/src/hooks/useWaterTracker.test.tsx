import { Window } from 'happy-dom';
const window = new Window();
globalThis.window = window as any;
globalThis.document = window.document as any;

import { renderHook, act } from '@testing-library/react';
import useWaterTracker from './useWaterTracker';
import * as waterTrackerUtils from '../utils/waterTrackerUtils';

jest.mock('../utils/waterTrackerUtils', () => ({
  loadWaterTrackerData: jest.fn(),
  saveWaterTrackerData: jest.fn(),
  getTodayString: jest.fn(),
}));

describe('useWaterTracker 훅', () => {
  const mockLoadWaterTrackerData =
    waterTrackerUtils.loadWaterTrackerData as jest.Mock;
  const mockSaveWaterTrackerData =
    waterTrackerUtils.saveWaterTrackerData as jest.Mock;
  const mockGetTodayString = waterTrackerUtils.getTodayString as jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    window.localStorage.clear();

    // 기본 mock 설정
    mockGetTodayString.mockReturnValue('2025-01-01');
    mockLoadWaterTrackerData.mockReturnValue({
      lastUpdatedDate: '2025-01-01',
      cupSize: 500,
      count: 0,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('초기 상태를 올바르게 로드해야 함', () => {
    const { result } = renderHook(() => useWaterTracker());

    expect(mockLoadWaterTrackerData).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({
      lastUpdatedDate: '2025-01-01',
      cupSize: 500,
      count: 0,
    });
    expect(result.current.totalIntake).toBe(0);
  });

  it('handleIncrement를 호출하면 count가 증가하고 데이터를 저장해야 함', () => {
    const { result } = renderHook(() => useWaterTracker());

    act(() => {
      result.current.handleIncrement();
    });

    expect(mockSaveWaterTrackerData).toHaveBeenCalledWith({
      lastUpdatedDate: '2025-01-01',
      cupSize: 500,
      count: 1,
    });
    expect(result.current.data.count).toBe(1);
    expect(result.current.totalIntake).toBe(0.5); // 1 * 500ml = 0.5L
  });

  it('handleDecrement를 호출하면 count가 감소해야 함', () => {
    mockLoadWaterTrackerData.mockReturnValue({
      lastUpdatedDate: '2025-01-01',
      cupSize: 500,
      count: 2,
    });

    const { result } = renderHook(() => useWaterTracker());

    act(() => {
      result.current.handleDecrement();
    });

    expect(mockSaveWaterTrackerData).toHaveBeenCalledWith({
      lastUpdatedDate: '2025-01-01',
      cupSize: 500,
      count: 1,
    });
    expect(result.current.data.count).toBe(1);
  });

  it('count가 0일 때 handleDecrement를 호출하면 count가 음수가 되지 않아야 함', () => {
    const { result } = renderHook(() => useWaterTracker());

    act(() => {
      result.current.handleDecrement();
    });

    expect(mockSaveWaterTrackerData).not.toHaveBeenCalled();
    expect(result.current.data.count).toBe(0);
  });

  it('handleSaveCupSize를 호출하면 컵 사이즈를 저장해야 함', () => {
    const { result } = renderHook(() => useWaterTracker());

    act(() => {
      result.current.setTempCupSize(300);
    });

    act(() => {
      result.current.handleSaveCupSize();
    });

    expect(mockSaveWaterTrackerData).toHaveBeenCalledWith({
      lastUpdatedDate: '2025-01-01',
      cupSize: 300,
      count: 0,
    });
    expect(result.current.data.cupSize).toBe(300);
    expect(result.current.isEditingCupSize).toBe(false);
  });

  it('컵 사이즈는 100ml 미만으로 설정할 수 없어야 함', () => {
    const { result } = renderHook(() => useWaterTracker());

    act(() => {
      result.current.setTempCupSize(50);
    });

    act(() => {
      result.current.handleSaveCupSize();
    });

    expect(result.current.data.cupSize).toBe(100); // 최소값으로 제한
  });

  it('컵 사이즈는 2000ml를 초과할 수 없어야 함', () => {
    const { result } = renderHook(() => useWaterTracker());

    act(() => {
      result.current.setTempCupSize(3000);
    });

    act(() => {
      result.current.handleSaveCupSize();
    });

    expect(result.current.data.cupSize).toBe(2000); // 최대값으로 제한
  });

  it('총 섭취량을 올바르게 계산해야 함', () => {
    mockLoadWaterTrackerData.mockReturnValue({
      lastUpdatedDate: '2025-01-01',
      cupSize: 500,
      count: 3,
    });

    const { result } = renderHook(() => useWaterTracker());

    expect(result.current.totalIntake).toBe(1.5); // 3 * 500ml = 1.5L
  });

  it('날짜가 변경되면 데이터를 자동으로 리셋해야 함', () => {
    const { result } = renderHook(() => useWaterTracker());

    // 초기 상태 확인
    expect(result.current.data.count).toBe(0);

    // 날짜가 변경된 새로운 데이터를 반환하도록 설정
    mockLoadWaterTrackerData.mockReturnValue({
      lastUpdatedDate: '2025-01-02',
      cupSize: 500,
      count: 0,
    });

    // visibilitychange 이벤트 트리거
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.data.lastUpdatedDate).toBe('2025-01-02');
  });

  it('1분마다 주기적으로 날짜를 체크해야 함', () => {
    renderHook(() => useWaterTracker());

    // loadWaterTrackerData가 초기에 1번 호출됨
    expect(mockLoadWaterTrackerData).toHaveBeenCalledTimes(1);

    // 1분 경과
    act(() => {
      jest.advanceTimersByTime(60000);
    });

    // 주기적 체크에서 1번 더 호출됨
    expect(mockLoadWaterTrackerData).toHaveBeenCalledTimes(2);

    // 추가 1분 경과
    act(() => {
      jest.advanceTimersByTime(60000);
    });

    // 또 1번 더 호출됨
    expect(mockLoadWaterTrackerData).toHaveBeenCalledTimes(3);
  });

  it('컴포넌트 언마운트 시 이벤트 리스너와 인터벌을 정리해야 함', () => {
    const { unmount } = renderHook(() => useWaterTracker());

    const clearIntervalSpy = jest.spyOn(globalThis, 'clearInterval');
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    );
  });
});
