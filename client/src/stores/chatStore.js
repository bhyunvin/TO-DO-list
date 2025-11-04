import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Chat message interface structure
// {
//   id: string,
//   content: string,
//   isUser: boolean,
//   timestamp: Date,
//   isHtml?: boolean
// }

export const useChatStore = create(
  persist(
    (set, get) => ({
      // Persisted state
      messages: [],

      // Non-persisted state (will be reset on page reload)
      isLoading: false,
      error: null,

      // Actions
      addMessage: (messageData) => {
        const message = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          ...messageData,
        };
        
        set((state) => ({
          messages: [...state.messages, message],
          error: null, // Clear any previous errors when adding a message
        }));
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error, isLoading: false }),

      clearMessages: () => set({ messages: [] }),

      clearError: () => set({ error: null }),

      // Helper to get the last few messages for context
      getRecentMessages: (count = 10) => {
        const { messages } = get();
        return messages.slice(-count);
      },
    }),
    {
      name: 'chat-storage', // sessionStorage key name
      storage: createJSONStorage(() => sessionStorage),
      // Only persist messages, not loading states or errors
      partialize: (state) => ({
        messages: state.messages,
      }),
    }
  )
);