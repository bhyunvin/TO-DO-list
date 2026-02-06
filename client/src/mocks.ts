import { mock, jest } from 'bun:test';

const mockTodoService = {
  getTodos: jest.fn(async () => []),
  searchTodos: jest.fn(async () => []),
  createTodo: jest.fn(async (data: any) => ({ success: true, ...data })),
  updateTodo: jest.fn(async (id: any, data: any) => ({
    success: true,
    ...data,
  })),
  deleteTodo: jest.fn(async () => ({ success: true })),
  getAttachments: jest.fn(async () => []),
  deleteAttachment: jest.fn(async () => {}),
  downloadExcel: jest.fn(async () => new Blob([])),
};

const mockUserService = {
  getProfile: jest.fn(async () => ({ userId: 'test', userName: 'Test User' })),
  getUserProfileDetail: jest.fn(async () => ({
    userId: 'test',
    userName: 'Test User',
  })),
  updateProfile: jest.fn(async () => ({
    userId: 'test',
    userName: 'Updated User',
    profileImage: 'img.png',
  })),
  changePassword: jest.fn(async () => ({ success: true })),
};

const mockAuthService = {
  login: jest.fn(async () => ({
    accessToken: 'mock-token',
    user: { userId: 'test' },
  })),
  logout: jest.fn(async () => {}),
  signup: jest.fn(async () => ({ success: true })),
  checkDuplicateId: jest.fn(async () => false),
};

const mockAiService = {
  chat: jest.fn(async () => ({
    success: true,
    response: 'Mock AI Response',
    error: null,
  })),
};

// Mock absolute paths (safest)
const ROOT = '/Users/bhyunvin/workspace/todoList/TO-DO-list/client/src';

// Mock ThemeStore (Zustand)
// Mock ThemeStore (Zustand)
const initialThemeState = {
  theme: 'light',
  toggleTheme: jest.fn(),
  initializeTheme: jest.fn(),
  setTheme: jest.fn(),
};

const mockThemeStore = jest.fn((selector) => {
  return selector ? selector(initialThemeState) : initialThemeState;
});

// Add Zustand static methods
Object.assign(mockThemeStore, {
  getState: jest.fn(() => initialThemeState),
  setState: jest.fn(),
  subscribe: jest.fn(() => jest.fn()), // return unsubscribe function
});

mock.module(`${ROOT}/stores/themeStore.ts`, () => ({
  useThemeStore: mockThemeStore,
}));
mock.module(`${ROOT}/stores/themeStore`, () => ({
  useThemeStore: mockThemeStore,
}));
mock.module('./stores/themeStore', () => ({
  useThemeStore: mockThemeStore,
}));

mock.module(`${ROOT}/api/todoService.ts`, () => ({ default: mockTodoService }));
mock.module(`${ROOT}/api/userService.ts`, () => ({ default: mockUserService }));
mock.module(`${ROOT}/api/authService.ts`, () => ({ default: mockAuthService }));
mock.module(`${ROOT}/api/aiService.ts`, () => ({ default: mockAiService }));

// Mock Vercel libraries
mock.module('@vercel/analytics/react', () => ({
  Analytics: () => null,
}));
mock.module('@vercel/speed-insights/react', () => ({
  SpeedInsights: () => null,
}));

console.log('!!! MANUAL MOCKS LOADED !!!');
