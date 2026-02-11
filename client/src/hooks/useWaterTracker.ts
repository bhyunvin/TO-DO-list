import { useState, useEffect } from 'react';
import {
  loadWaterTrackerData,
  saveWaterTrackerData,
  getTodayString,
  type WaterTrackerData,
} from '../utils/waterTrackerUtils';

/**
 * 수분 섭취 트래커를 관리하는 커스텀 훅
 * - 날짜가 변경되면 자동으로 데이터 초기화
 * - 증가/감소 로직 및 컵 사이즈 설정 관리
 */
const useWaterTracker = () => {
  // 데이터 상태 관리
  const [data, setData] = useState<WaterTrackerData>(() => {
    return loadWaterTrackerData();
  });
  const [isEditingCupSize, setIsEditingCupSize] = useState(false);
  const [tempCupSize, setTempCupSize] = useState(data.cupSize);
  const [isAnimating, setIsAnimating] = useState(false);

  // 하루가 새로 시작되었을 때 데이터 자동 초기화
  useEffect(() => {
    const checkAndResetData = () => {
      const currentData = loadWaterTrackerData();
      // 날짜가 변경되었다면 (loadWaterTrackerData 내부에서 이미 리셋된 데이터 반환)
      if (
        currentData.lastUpdatedDate !== data.lastUpdatedDate ||
        currentData.count !== data.count
      ) {
        setData(currentData);
        setTempCupSize(currentData.cupSize);
      }
    };

    // 탭 활성화 시 실행 (켜두고 잤다가 다음날 아침에 보는 경우 등)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndResetData();
      }
    };

    // 주기적으로 체크 (1분마다) - 탭이 활성화되어 있는 동안에도 날짜 변경 감지
    const intervalId = setInterval(checkAndResetData, 60000);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [data.lastUpdatedDate, data.count]);

  // 횟수 증가
  const handleIncrement = () => {
    const newData = {
      ...data,
      count: data.count + 1,
      lastUpdatedDate: getTodayString(),
    };
    setData(newData);
    saveWaterTrackerData(newData);

    // 물 차오르는 애니메이션 효과
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 400);
  };

  // 횟수 감소
  const handleDecrement = () => {
    if (data.count > 0) {
      const newData = {
        ...data,
        count: data.count - 1,
        lastUpdatedDate: getTodayString(),
      };
      setData(newData);
      saveWaterTrackerData(newData);
    }
  };

  // 용량 설정 저장
  const handleSaveCupSize = () => {
    const newCupSize = Math.max(100, Math.min(2000, tempCupSize)); // 100ml ~ 2000ml 제한
    const newData = {
      ...data,
      cupSize: newCupSize,
    };
    setData(newData);
    saveWaterTrackerData(newData);
    setIsEditingCupSize(false);
  };

  // 총 섭취량 계산 (L 단위)
  const totalIntake = (data.count * data.cupSize) / 1000;

  return {
    // 상태
    data,
    isEditingCupSize,
    tempCupSize,
    isAnimating,
    totalIntake,
    // 상태 변경 함수
    setIsEditingCupSize,
    setTempCupSize,
    // 핸들러
    handleIncrement,
    handleDecrement,
    handleSaveCupSize,
  };
};

export default useWaterTracker;
