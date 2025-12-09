import { useEffect } from 'react';
import { useAuthStore } from './authStore/authStore';
import { useThemeStore } from './stores/themeStore';
import LoginForm from './loginForm/LoginForm';
import TodoList from './todoList/TodoList';
import './App.css';

function App() {
  const { user } = useAuthStore();
  const initializeTheme = useThemeStore((state) => state.initializeTheme);

  // 애플리케이션 마운트 시 테마 초기화
  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  return <>{user ? <TodoList /> : <LoginForm />}</>;
}

export default App;
