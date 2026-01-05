import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { useAuthStore } from './authStore/authStore';
import { useThemeStore } from './stores/themeStore';
import LoginForm from './loginForm/LoginForm';
import TodoList from './todoList/TodoList';
import './App.css';

const App = () => {
  const { user } = useAuthStore();
  const initializeTheme = useThemeStore((state) => state.initializeTheme);

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  return (
    <>
      {user ? <TodoList /> : <LoginForm />}
      <Analytics />
    </>
  );
};

export default App;