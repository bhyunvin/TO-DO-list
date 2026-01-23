import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// User 타입 정의
interface User {
  userNo: number;
  userId?: string;
  userEmail: string;
  userName: string;
  userPhone?: string;
  profileImage?: string;
  aiApiKey?: string;
  fileGroupNo?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// AuthStore 인터페이스 정의
interface AuthStore {
  user: User | null;
  accessToken: string | null;
  login: (userData: User, token?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist<AuthStore>(
    (set) => ({
      user: null,
      accessToken: null,

      login: (userData, token) =>
        set((state) => ({
          user: userData,
          accessToken: token || state.accessToken,
        })),
      logout: () => set({ user: null, accessToken: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
