import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// User 타입 정의
export interface User {
  userSeq: number;
  userId: string;
  userEmail: string;
  userName: string;
  userDescription?: string;
  profileImage?: string;
  hasAiApiKey?: boolean;
  fileGroupNo?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
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
