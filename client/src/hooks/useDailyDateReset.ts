import { useEffect } from 'react';
import { showToast } from '../utils/alertUtils';

/**
 * 매일 23시 59분 59초가 지나 새로운 날이 되었을 때,
 * 사용자가 현재 조작 중인 날짜가 '오늘'이 아니라면 '오늘'로 강제 이동시키는 훅
 * (앱에 처음 진입하거나, 탭을 켜둔 채 다음날이 되어 다시 활성화되었을 때 동작)
 *
 * @param {Date} selectedDate - 현재 선택된 날짜 State
 * @param {Function} handleToday - '오늘'로 이동하는 핸들러 함수
 */
const useDailyDateReset = (selectedDate, handleToday) => {
  useEffect(() => {
    const checkAndResetDate = () => {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      // 마지막으로 '하루 시작 체크'를 수행한 날짜
      const lastDailyReset = localStorage.getItem('lastDailyReset');

      // 오늘 처음 접속했거나 (혹은 로컬스토리지 값이 없거나)
      // 마지막 접속 날짜가 오늘이 아니라면
      if (lastDailyReset !== todayStr) {
        // 현재 선택된 날짜와 '오늘' 비교를 위해 selectedDate 포맷팅
        const selectedYear = selectedDate.getFullYear();
        const selectedMonth = String(selectedDate.getMonth() + 1).padStart(
          2,
          '0',
        );
        const selectedDay = String(selectedDate.getDate()).padStart(2, '0');
        const selectedDateStr = `${selectedYear}-${selectedMonth}-${selectedDay}`;

        // 만약 사용자가 보고 있는 날짜가 오늘이 아니라면 -> 오늘로 리셋 & 알림
        if (selectedDateStr !== todayStr) {
          handleToday();
          showToast({
            title: '새로운 하루가 시작되었습니다! \n오늘 날짜로 이동합니다.',
            icon: 'info',
          });
        }

        // 오늘 날짜로 갱신 (이미 오늘을 보고 있어도 갱신하여 중복 체크 방지)
        localStorage.setItem('lastDailyReset', todayStr);
      }
    };

    // 마운트 시 실행 (새로고침, 앱 처음 진입)
    checkAndResetDate();

    // 탭 활성화 시 실행 (켜두고 잤다가 다음날 아침에 보는 경우 등)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndResetDate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedDate, handleToday]);
};

export default useDailyDateReset;
