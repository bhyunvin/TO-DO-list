import { useThemeStore } from '../stores/themeStore';
import { FaMoon } from '@react-icons/all-files/fa/FaMoon';
import { FaSun } from '@react-icons/all-files/fa/FaSun';
import './ThemeToggle.css';

/**
 * 다크 모드 토글 컴포넌트
 * 프로필 드롭다운 메뉴에서 테마를 전환할 수 있는 스위치 제공
 */
const ThemeToggle = () => {
  const { theme, toggleTheme } = useThemeStore();

  /**
   * 토글 클릭 핸들러
   * 이벤트 전파를 중지하여 드롭다운이 닫히지 않도록 함
   */
  const handleToggle = (e) => {
    e.stopPropagation();
    e.preventDefault();
    toggleTheme();
  };

  return (
    <div
      className="theme-toggle-wrapper"
      onClick={handleToggle}
      role="switch"
      aria-checked={theme === 'dark'}
      aria-label="다크 모드 전환"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleToggle(e as any);
        }
      }}
    >
      <span className="theme-toggle-label">다크 모드</span>
      <div className="theme-toggle-switch">
        <div
          className={`theme-toggle-slider ${theme === 'dark' ? 'dark' : 'light'}`}
        >
          <div className="theme-toggle-icon">
            {theme === 'dark' ? <FaMoon /> : <FaSun />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeToggle;
