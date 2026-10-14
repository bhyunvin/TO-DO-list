import { mock, jest } from 'bun:test';
import { CreateTodoDto, UpdateTodoDto } from './api/todoService';

const mockTodoService = {
  getTodos: jest.fn(() => Promise.resolve([])),
  searchTodos: jest.fn(() => Promise.resolve([])),
  createTodo: jest.fn((data: CreateTodoDto) =>
    Promise.resolve({
      success: true,
      ...data,
    }),
  ),
  updateTodo: jest.fn((id: number | string, data: UpdateTodoDto) =>
    Promise.resolve({
      success: true,
      id,
      ...data,
    }),
  ),
  deleteTodo: jest.fn(() => Promise.resolve({ success: true })),
  getAttachments: jest.fn(() => Promise.resolve([])),
  deleteAttachment: jest.fn(() => Promise.resolve()),
  downloadExcel: jest.fn(() => Promise.resolve(new Blob([]))),
};

const mockUserService = {
  getProfile: jest.fn(() =>
    Promise.resolve({ userId: 'test', userName: 'Test User' }),
  ),
  getUserProfileDetail: jest.fn(() =>
    Promise.resolve({
      userId: 'test',
      userName: 'Test User',
    }),
  ),
  updateProfile: jest.fn(() =>
    Promise.resolve({
      userId: 'test',
      userName: 'Updated User',
      profileImage: 'img.png',
    }),
  ),
  changePassword: jest.fn(() => Promise.resolve({ success: true })),
};

const mockAuthService = {
  login: jest.fn(() =>
    Promise.resolve({
      accessToken: 'mock-token',
      user: { userId: 'test' },
    }),
  ),
  logout: jest.fn(() => Promise.resolve()),
  signup: jest.fn(() => Promise.resolve({ success: true })),
  checkDuplicateId: jest.fn(() => Promise.resolve(false)),
};

const mockAiService = {
  chat: jest.fn(() =>
    Promise.resolve({
      success: true,
      response: 'Mock AI Response',
      error: null,
    }),
  ),
};

// 절대 경로 모킹 (가장 안전함)
const ROOT = '/Users/bhyunvin/workspace/todoList/TO-DO-list/client/src';

// ThemeStore 모킹 (Zustand)
const initialThemeState = {
  theme: 'light',
  toggleTheme: jest.fn(),
  initializeTheme: jest.fn(),
  setTheme: jest.fn(),
};

const mockThemeStore = jest.fn((selector) => {
  return selector ? selector(initialThemeState) : initialThemeState;
});

// Zustand 정적 메서드 추가
Object.assign(mockThemeStore, {
  getState: jest.fn(() => initialThemeState),
  setState: jest.fn(),
  subscribe: jest.fn(() => jest.fn()), // 구독 해제 함수 반환
});

void mock.module(`${ROOT}/stores/themeStore.ts`, () => ({
  useThemeStore: mockThemeStore,
}));
void mock.module(`${ROOT}/stores/themeStore`, () => ({
  useThemeStore: mockThemeStore,
}));
void mock.module('./stores/themeStore', () => ({
  useThemeStore: mockThemeStore,
}));

void mock.module(`${ROOT}/api/todoService.ts`, () => ({
  default: mockTodoService,
}));
void mock.module(`${ROOT}/api/userService.ts`, () => ({
  default: mockUserService,
}));
void mock.module(`${ROOT}/api/authService.ts`, () => ({
  default: mockAuthService,
}));
void mock.module(`${ROOT}/api/aiService.ts`, () => ({
  default: mockAiService,
}));

// Vercel 라이브러리 모킹
void mock.module('@vercel/analytics/react', () => ({
  Analytics: () => null,
}));
void mock.module('@vercel/speed-insights/react', () => ({
  SpeedInsights: () => null,
}));

console.log('!!! 수동 모의 객체(Mocks) 로드됨 !!!');
