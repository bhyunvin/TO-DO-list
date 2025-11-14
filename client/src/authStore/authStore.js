import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,

      login: (userData) => set({ user: userData }),
      logout: () => set({ user: null }),

      api: async (url, options) => {
        const response = await fetch(url, options);

        if (response.status === 401 || response.status === 504) {
          set({ user: null });
        }

        return response;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);