/* eslint-disable testing-library/no-node-access */
/* eslint-disable testing-library/no-container */
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from './ThemeToggle';
import { useThemeStore } from '../stores/themeStore';

// Zustand 스토어 모킹
vi.mock('../stores/themeStore');

describe('ThemeToggle', () => {
  let mockToggleTheme;

  beforeEach(() => {
    // 각 테스트 전에 mock 함수 초기화
    mockToggleTheme = vi.fn();

    // useThemeStore의 기본 mock 구현
    vi.mocked(useThemeStore).mockReturnValue({
      theme: 'light',
      toggleTheme: mockToggleTheme,
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    test('renders with correct label "다크 모드"', () => {
      render(<ThemeToggle />);

      expect(screen.getByText('다크 모드')).toBeInTheDocument();
    });

    test('renders custom switch component', () => {
      render(<ThemeToggle />);

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toBeInTheDocument();
    });

    test('has correct aria-label for accessibility', () => {
      render(<ThemeToggle />);

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-label', '다크 모드 전환');
    });

    test('displays sun icon when theme is light', () => {
      render(<ThemeToggle />);

      // react-icons renders an svg
      const sunIcon = document.querySelector('svg');
      expect(sunIcon).toBeInTheDocument();
    });

    test('displays moon icon when theme is dark', () => {
      vi.mocked(useThemeStore).mockReturnValue({
        theme: 'dark',
        toggleTheme: mockToggleTheme,
      } as any);

      render(<ThemeToggle />);

      const moonIcon = document.querySelector('svg');
      expect(moonIcon).toBeInTheDocument();
    });
  });

  describe('Theme State Reflection', () => {
    test('switch shows light state when theme is light', () => {
      vi.mocked(useThemeStore).mockReturnValue({
        theme: 'light',
        toggleTheme: mockToggleTheme,
      } as any);

      render(<ThemeToggle />);

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-checked', 'false');

      const slider = document.querySelector('.theme-toggle-slider');
      expect(slider).toHaveClass('light');
    });

    test('switch shows dark state when theme is dark', () => {
      vi.mocked(useThemeStore).mockReturnValue({
        theme: 'dark',
        toggleTheme: mockToggleTheme,
      } as any);

      render(<ThemeToggle />);

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-checked', 'true');

      const slider = document.querySelector('.theme-toggle-slider');
      expect(slider).toHaveClass('dark');
    });
  });

  describe('Toggle Functionality', () => {
    test('calls toggleTheme when wrapper is clicked', () => {
      render(<ThemeToggle />);

      const wrapper = screen
        .getByText('다크 모드')
        .closest('.theme-toggle-wrapper');
      fireEvent.click(wrapper);

      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    test('calls toggleTheme when switch is clicked', () => {
      render(<ThemeToggle />);

      const switchElement = screen.getByRole('switch');
      fireEvent.click(switchElement);

      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    test('calls toggleTheme only once when clicked', () => {
      render(<ThemeToggle />);

      const wrapper = screen
        .getByText('다크 모드')
        .closest('.theme-toggle-wrapper');
      fireEvent.click(wrapper);

      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
      expect(mockToggleTheme).toHaveBeenCalledWith();
    });
  });

  describe('Event Propagation', () => {
    test('stops event propagation when wrapper is clicked', () => {
      const mockParentClick = vi.fn();

      const { container } = render(
        <button onClick={mockParentClick} className="theme-toggle-wrapper-mock">
          <ThemeToggle />
        </button>,
      );

      const toggleWrapper = container.querySelector('.theme-toggle-wrapper');
      fireEvent.click(toggleWrapper);

      // toggleTheme은 호출되어야 함
      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
      // 부모 클릭 핸들러는 호출되지 않아야 함 (이벤트 전파 중지)
      expect(mockParentClick).not.toHaveBeenCalled();
    });

    test('prevents dropdown from closing when toggle is clicked', () => {
      const mockDropdownClick = vi.fn();

      const { container } = render(
        <button className="dropdown-menu" onClick={mockDropdownClick}>
          <ThemeToggle />
        </button>,
      );

      const toggleWrapper = container.querySelector('.theme-toggle-wrapper');
      fireEvent.click(toggleWrapper);

      // 드롭다운 클릭 핸들러는 호출되지 않아야 함
      expect(mockDropdownClick).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Accessibility', () => {
    test('switch is focusable', () => {
      render(<ThemeToggle />);

      const switchElement = screen.getByRole('switch');
      switchElement.focus();

      expect(switchElement).toHaveFocus();
    });

    test('can be activated with Space key', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const switchElement = screen.getByRole('switch');
      switchElement.focus();

      await user.keyboard(' ');

      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    test('can be activated with Enter key', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const switchElement = screen.getByRole('switch');
      switchElement.focus();

      await user.keyboard('{Enter}');

      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    test('supports tab navigation', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <button>Previous Element</button>
          <ThemeToggle />
          <button>Next Element</button>
        </div>,
      );

      const switchElement = screen.getByRole('switch');

      // Tab으로 스위치로 이동
      await user.tab();
      await user.tab();

      expect(switchElement).toHaveFocus();
    });
  });

  describe('Integration Scenarios', () => {
    test('updates visual state when theme changes', () => {
      const { rerender } = render(<ThemeToggle />);

      // 초기 상태: light 테마
      let switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-checked', 'false');
      let slider = document.querySelector('.theme-toggle-slider');
      expect(slider).toHaveClass('light');

      // 테마를 dark로 변경
      vi.mocked(useThemeStore).mockReturnValue({
        theme: 'dark',
        toggleTheme: mockToggleTheme,
      } as any);

      rerender(<ThemeToggle />);

      // 스위치가 dark 상태로 변경됨
      switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-checked', 'true');
      slider = document.querySelector('.theme-toggle-slider');
      expect(slider).toHaveClass('dark');
    });

    test('handles multiple rapid clicks', () => {
      render(<ThemeToggle />);

      const wrapper = screen
        .getByText('다크 모드')
        .closest('.theme-toggle-wrapper');

      // 빠른 연속 클릭
      fireEvent.click(wrapper);
      fireEvent.click(wrapper);
      fireEvent.click(wrapper);

      expect(mockToggleTheme).toHaveBeenCalledTimes(3);
    });

    test('maintains accessibility attributes across theme changes', () => {
      const { rerender } = render(<ThemeToggle />);

      let switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-label', '다크 모드 전환');

      // 테마 변경
      vi.mocked(useThemeStore).mockReturnValue({
        theme: 'dark',
        toggleTheme: mockToggleTheme,
      } as any);

      rerender(<ThemeToggle />);

      switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-label', '다크 모드 전환');
    });
  });

  describe('Component Structure', () => {
    test('renders with theme-toggle-wrapper class', () => {
      const { container } = render(<ThemeToggle />);

      const toggleWrapper = container.querySelector('.theme-toggle-wrapper');
      expect(toggleWrapper).toBeInTheDocument();
    });

    test('renders with theme-toggle-switch class', () => {
      const { container } = render(<ThemeToggle />);

      const toggleSwitch = container.querySelector('.theme-toggle-switch');
      expect(toggleSwitch).toBeInTheDocument();
    });

    test('label is displayed alongside switch', () => {
      render(<ThemeToggle />);

      const label = screen.getByText('다크 모드');
      const switchElement = screen.getByRole('switch');

      // label과 switch가 모두 렌더링되어 있는지 확인
      expect(label).toBeInTheDocument();
      expect(switchElement).toBeInTheDocument();
    });

    test('renders slider with correct initial class', () => {
      const { container } = render(<ThemeToggle />);

      const slider = container.querySelector('.theme-toggle-slider');
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveClass('light');
    });
  });
});
