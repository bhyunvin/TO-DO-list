/**
 * 수분 섭취 트래커 데이터 타입 정의
 */
export interface WaterTrackerData {
  lastUpdatedDate: string; // "YYYY-MM-DD" 형식
  cupSize: number; // ml 단위
  count: number; // 섭취 횟수
}

/**
 * localStorage 키
 */
const STORAGE_KEY = 'waterTracker';

/**
 * 현재 날짜를 "YYYY-MM-DD" 형식으로 반환
 */
export const getTodayString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 기본값
 */
const DEFAULT_DATA: WaterTrackerData = {
  lastUpdatedDate: getTodayString(),
  cupSize: 500,
  count: 0,
};

/**
 * localStorage에서 수분 섭취 데이터를 로드
 */
export const loadWaterTrackerData = (): WaterTrackerData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_DATA };
    }

    const data: WaterTrackerData = JSON.parse(stored);

    // 날짜가 다르면 count 리셋
    return checkAndResetIfNewDay(data);
  } catch (error) {
    console.error('수분 섭취 데이터 로드 실패:', error);
    return { ...DEFAULT_DATA };
  }
};

/**
 * localStorage에 수분 섭취 데이터를 저장
 */
export const saveWaterTrackerData = (data: WaterTrackerData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('수분 섭취 데이터 저장 실패:', error);
  }
};

/**
 * 날짜 확인 및 필요시 count 리셋
 * cupSize는 유지
 */
export const checkAndResetIfNewDay = (
  data: WaterTrackerData,
): WaterTrackerData => {
  const today = getTodayString();

  if (data.lastUpdatedDate !== today) {
    // 날짜가 바뀌었으면 count만 리셋하고 cupSize는 유지
    return {
      lastUpdatedDate: today,
      cupSize: data.cupSize || DEFAULT_DATA.cupSize,
      count: 0,
    };
  }

  return data;
};
