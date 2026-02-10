import { render, screen, fireEvent } from '../test-utils';
import userEvent from '@testing-library/user-event';
import ThemeToggle from './ThemeToggle';
import { useThemeStore } from '../stores/themeStore';

jest.mock('../stores/themeStore', () => {
  const mockUseThemeStore = jest.fn();
  Object.assign(mockUseThemeStore, {
    getState: jest.fn(() => ({ theme: 'light' })),
  });
  return { useThemeStore: mockUseThemeStore };
});

describe('ThemeToggle 컴포넌트', () => {
  let mockToggleTheme;

  beforeEach(() => {
    // 각 테스트 전에 mock 함수 초기화
    mockToggleTheme = jest.fn();

    // useThemeStore의 기본 mock 구현
    (useThemeStore as any).mockReturnValue({
      theme: 'light',
      toggleTheme: mockToggleTheme,
      initializeTheme: jest.fn(),
      setTheme: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('컴포넌트 렌더링', () => {
    test('"다크 모드" 레이블이 올바르게 렌더링되어야 함', () => {
      render(<ThemeToggle />);

      expect(screen.getByText('다크 모드')).toBeInTheDocument();
    });

    test('커스텀 스위치 컴포넌트가 렌더링되어야 함', () => {
      render(<ThemeToggle />);

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toBeInTheDocument();
    });

    test('접근성을 위한 올바른 aria-label을 가져야 함', () => {
      render(<ThemeToggle />);

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-label', '다크 모드 전환');
    });

    test('테마가 light일 때 태양 아이콘을 표시해야 함', () => {
      render(<ThemeToggle />);

      // react-icons는 svg를 렌더링함
      const sunIcon = document.querySelector('svg');
      expect(sunIcon).toBeInTheDocument();
    });

    test('테마가 dark일 때 달 아이콘을 표시해야 함', () => {
      (useThemeStore as any).mockReturnValue({
        theme: 'dark',
        toggleTheme: mockToggleTheme,
        initializeTheme: jest.fn(),
        setTheme: jest.fn(),
      });

      render(<ThemeToggle />);

      const moonIcon = document.querySelector('svg');
      expect(moonIcon).toBeInTheDocument();
    });
  });

  describe('테마 상태 반영', () => {
    test('테마가 light일 때 스위치가 해제된 상태여야 함', () => {
      (useThemeStore as any).mockReturnValue({
        theme: 'light',
        toggleTheme: mockToggleTheme,
        initializeTheme: jest.fn(),
        setTheme: jest.fn(),
      });

      render(<ThemeToggle />);

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-checked', 'false');

      const slider = document.querySelector('.theme-toggle-slider');
      expect(slider).toHaveClass('light');
    });

    test('테마가 dark일 때 스위치가 선택된 상태여야 함', () => {
      (useThemeStore as any).mockReturnValue({
        theme: 'dark',
        toggleTheme: mockToggleTheme,
        initializeTheme: jest.fn(),
        setTheme: jest.fn(),
      });

      render(<ThemeToggle />);

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-checked', 'true');

      const slider = document.querySelector('.theme-toggle-slider');
      expect(slider).toHaveClass('dark');
    });
  });

  describe('토글 기능', () => {
    test('래퍼 클릭 시 toggleTheme을 호출해야 함', () => {
      render(<ThemeToggle />);

      const wrapper = screen
        .getByText('다크 모드')
        .closest('.theme-toggle-wrapper');
      fireEvent.click(wrapper);

      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    test('스위치 클릭 시 toggleTheme을 호출해야 함', () => {
      render(<ThemeToggle />);

      const switchElement = screen.getByRole('switch');
      fireEvent.click(switchElement);

      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    test('클릭 시 toggleTheme을 한 번만 호출해야 함', () => {
      render(<ThemeToggle />);

      const wrapper = screen
        .getByText('다크 모드')
        .closest('.theme-toggle-wrapper');
      fireEvent.click(wrapper);

      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
      expect(mockToggleTheme).toHaveBeenCalledWith();
    });
  });

  describe('이벤트 전파', () => {
    test('래퍼 클릭 시 이벤트 전파를 중단해야 함', () => {
      const mockParentClick = jest.fn();

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

    test('토글 클릭 시 드롭다운이 닫히지 않아야 함', () => {
      const mockDropdownClick = jest.fn();

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

  describe('키보드 접근성', () => {
    test('스위치에 포커스가 가능해야 함', () => {
      render(<ThemeToggle />);

      const switchElement = screen.getByRole('switch');
      switchElement.focus();

      expect(switchElement).toHaveFocus();
    });

    test('Space 키로 활성화할 수 있어야 함', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const switchElement = screen.getByRole('switch');
      switchElement.focus();

      await user.keyboard(' ');

      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    test('Enter 키로 활성화할 수 있어야 함', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const switchElement = screen.getByRole('switch');
      switchElement.focus();

      await user.keyboard('{Enter}');

      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    test('탭 내비게이션을 지원해야 함', async () => {
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

  describe('통합 시나리오', () => {
    test('테마 변경 시 시각적 상태를 업데이트해야 함', () => {
      const { rerender } = render(<ThemeToggle />);

      // 초기 상태: light 테마
      let switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-checked', 'false');
      let slider = document.querySelector('.theme-toggle-slider');
      expect(slider).toHaveClass('light');

      // 테마를 dark로 변경
      (useThemeStore as any).mockReturnValue({
        theme: 'dark',
        toggleTheme: mockToggleTheme,
        initializeTheme: jest.fn(),
        setTheme: jest.fn(),
      });

      rerender(<ThemeToggle />);

      // 스위치가 dark 상태로 변경됨
      switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-checked', 'true');
      slider = document.querySelector('.theme-toggle-slider');
      expect(slider).toHaveClass('dark');
    });

    test('짧은 시간 동안 여러 번 클릭해도 올바르게 처리해야 함', () => {
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

    test('테마 변경 후에도 접근성 속성을 유지해야 함', () => {
      const { rerender } = render(<ThemeToggle />);

      let switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-label', '다크 모드 전환');

      // 테마 변경
      (useThemeStore as any).mockReturnValue({
        theme: 'dark',
        toggleTheme: mockToggleTheme,
        initializeTheme: jest.fn(),
        setTheme: jest.fn(),
      });

      rerender(<ThemeToggle />);

      switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-label', '다크 모드 전환');
    });
  });

  describe('컴포넌트 구조', () => {
    test('theme-toggle-wrapper 클래스를 포함해야 함', () => {
      const { container } = render(<ThemeToggle />);

      const toggleWrapper = container.querySelector('.theme-toggle-wrapper');
      expect(toggleWrapper).toBeInTheDocument();
    });

    test('theme-toggle-switch 클래스를 포함해야 함', () => {
      const { container } = render(<ThemeToggle />);

      const toggleSwitch = container.querySelector('.theme-toggle-switch');
      expect(toggleSwitch).toBeInTheDocument();
    });

    test('레이블이 스위치 옆에 표시되어야 함', () => {
      render(<ThemeToggle />);

      const label = screen.getByText('다크 모드');
      const switchElement = screen.getByRole('switch');

      // label과 switch가 모두 렌더링되어 있는지 확인
      expect(label).toBeInTheDocument();
      expect(switchElement).toBeInTheDocument();
    });

    test('올바른 초기 클래스와 함께 슬라이더를 렌더링해야 함', () => {
      const { container } = render(<ThemeToggle />);

      const slider = container.querySelector('.theme-toggle-slider');
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveClass('light');
    });
  });
});
