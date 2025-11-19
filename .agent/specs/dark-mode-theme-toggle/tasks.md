# Implementation Plan: Dark Mode with Theme Toggle

- [x] 1. Create Zustand theme store with persistence
  - Create `client/src/stores/themeStore.js` with theme state management
  - Implement `toggleTheme()`, `setTheme()`, and `initializeTheme()` functions
  - Configure Zustand persist middleware with localStorage
  - Add system preference detection using `window.matchMedia`
  - Implement `data-theme` attribute update on document element
  - _Requirements: 4.1, 4.2, 5.1, 5.2, 5.3, 5.4, 5.5, 6.5_

- [x] 2. Define global CSS Custom Properties for theming
  - [x] 2.1 Create light theme CSS variables in `client/src/index.css`
    - Define color variables for backgrounds, text, borders, and shadows
    - Set default light theme values
    - Add smooth transition properties for theme changes
    - _Requirements: 2.1, 2.2, 2.4_
  
  - [x] 2.2 Create dark theme CSS variables with `[data-theme='dark']` selector
    - Define dark theme color palette with appropriate contrast ratios
    - Ensure WCAG 2.1 Level AA compliance for all text colors
    - Add dark theme shadow values
    - _Requirements: 2.1, 2.3, 2.4, 6.4_
  
  - [x] 2.3 Add reduced motion support
    - Implement `@media (prefers-reduced-motion: reduce)` query
    - Reduce transition durations for accessibility
    - _Requirements: 6.1_

- [x] 3. Create ThemeToggle component
  - [x] 3.1 Implement ThemeToggle component with React Bootstrap switch
    - Create `client/src/components/ThemeToggle.js`
    - Use `Form.Check` with switch variant
    - Connect to Zustand theme store
    - Add "다크 모드" label
    - Implement click handler with event propagation prevention
    - _Requirements: 1.3, 1.4, 5.2, 5.3_
  
  - [x] 3.2 Add ThemeToggle styles
    - Create `client/src/components/ThemeToggle.css`
    - Style toggle container to match dropdown menu items
    - Add hover and focus states
    - Ensure proper spacing and alignment
    - _Requirements: 1.3, 6.2, 6.3_

- [x] 4. Initialize theme in App component
  - Modify `client/src/App.js` to call `initializeTheme()` on mount
  - Add `useEffect` hook to initialize theme
  - Import and use `useThemeStore`
  - _Requirements: 4.2, 5.5_

- [x] 5. Integrate ThemeToggle into profile dropdown
  - Modify `client/src/todoList/TodoList.js`
  - Import ThemeToggle component
  - Add ThemeToggle between "비밀번호 변경" and "로그아웃" menu items
  - Add dropdown dividers for visual separation
  - Ensure dropdown remains open when toggle is clicked
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 6. Refactor TodoList.css to use CSS variables
  - [x] 6.1 Replace hardcoded colors with CSS variable references
    - Update all color values to use CSS variables
    - Map existing CSS variables to new global theme variables
    - Update background colors, text colors, and border colors
    - _Requirements: 2.4, 3.1, 3.2_
  
  - [x] 6.2 Update hover and focus states
    - Ensure hover states use theme-aware colors
    - Update focus indicators to use theme variables
    - Test visibility in both themes
    - _Requirements: 3.5, 6.4_

- [x] 7. Refactor LoginForm.css to use CSS variables
  - Update `client/src/loginForm/LoginForm.css`
  - Replace hardcoded colors with CSS variable references
  - Update container backgrounds, borders, and text colors
  - Ensure form inputs use theme-aware colors
  - _Requirements: 2.4, 3.1_

- [x] 8. Refactor ChatModal.css to use CSS variables
  - Update `client/src/components/ChatModal.css`
  - Replace hardcoded colors with CSS variable references
  - Update chat message backgrounds for user and assistant
  - Update modal background and text colors
  - Ensure proper contrast in both themes
  - _Requirements: 2.4, 3.3_

- [x] 9. Add Bootstrap component overrides for dark theme
  - [x] 9.1 Create dark theme overrides in `client/src/App.css`
    - Override Bootstrap button styles for dark theme
    - Override form control styles (inputs, textareas, selects)
    - Override modal styles
    - Override dropdown menu styles
    - Override table styles
    - _Requirements: 2.4, 3.2_
  
  - [x] 9.2 Test all Bootstrap components in dark theme
    - Verify buttons render correctly
    - Verify form controls are readable
    - Verify modals have proper backgrounds
    - Verify dropdowns match theme
    - _Requirements: 3.2, 3.4_

- [x] 10. Update remaining component styles
  - [x] 10.1 Update PasswordChangeForm styles
    - Modify `client/src/components/PasswordChangeForm.js` inline styles if any
    - Ensure form uses theme-aware colors
    - _Requirements: 3.2_
  
  - [x] 10.2 Update ProfileUpdateForm styles
    - Modify `client/src/components/ProfileUpdateForm.js` inline styles if any
    - Ensure form uses theme-aware colors
    - _Requirements: 3.2_
  
  - [x] 10.3 Update FloatingActionButton styles
    - Update `client/src/components/FloatingActionButton.css`
    - Ensure button colors work in both themes
    - Maintain existing color scheme or adapt to theme
    - _Requirements: 3.2_
  
  - [x] 10.4 Update FileUploadProgress styles
    - Update `client/src/components/FileUploadProgress.js` inline styles if any
    - Ensure progress indicators are visible in both themes
    - _Requirements: 3.2_

- [x] 11. Verify theme consistency across all pages
  - Test theme application on login page
  - Test theme application on signup page
  - Test theme application on todo list page
  - Test theme application in all modals and dropdowns
  - Verify smooth transitions between themes
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.1_

- [x] 12. Verify theme persistence functionality
  - Test theme persists after page reload
  - Test theme persists after logout and login
  - Test theme persists across browser tabs
  - Test default theme when no preference exists
  - Test system preference detection
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 13. Verify accessibility compliance
  - Test keyboard navigation for theme toggle
  - Test screen reader announcements
  - Verify focus indicators in both themes
  - Verify color contrast ratios meet WCAG AA standards
  - Test with reduced motion preference
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 14. Write unit tests for theme store
  - Create `client/src/stores/themeStore.test.js`
  - Test initial theme state
  - Test `toggleTheme()` functionality
  - Test `setTheme()` functionality
  - Test persistence to localStorage
  - Test theme restoration from localStorage
  - Test system preference detection
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 15. Write unit tests for ThemeToggle component
  - Create `client/src/components/ThemeToggle.test.js`
  - Test component renders with correct label
  - Test switch reflects current theme state
  - Test clicking toggle calls `toggleTheme()`
  - Test click event doesn't propagate
  - Test keyboard accessibility
  - _Requirements: 1.3, 1.4, 1.5, 6.2, 6.3_
