/**
 * 로컬 스토리지에서 저장된 테마 정보를 불러와 초기화하는 스크립트입니다.
 * 페이지 렌더링 전에 실행되어 테마 깜빡임(FOUC) 현상을 방지합니다.
 */
(function () {
  try {
    const savedTheme = localStorage.getItem('theme-storage');
    if (savedTheme) {
      const { state } = JSON.parse(savedTheme);
      if (state && state.theme) {
        document.documentElement.dataset.theme = state.theme;
      }
    }
  } catch (e) {
    console.warn('저장된 테마를 불러오는데 실패했습니다:', e);
  }
})();
