import { useEffect, Suspense, lazy } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { useAuthStore } from './authStore/authStore';
import { useThemeStore } from './stores/themeStore';
import './App.css';

const LoginForm = lazy(() => import('./loginForm/LoginForm'));
const TodoList = lazy(() => import('./todoList/TodoList'));

const LoadingFallback = () => (
  <div className="d-flex justify-content-center align-items-center vh-100">
    <output className="spinner-border text-primary">
      <span className="visually-hidden">Loading...</span>
    </output>
  </div>
);

const App = () => {
  const { user } = useAuthStore();
  const initializeTheme = useThemeStore((state) => state.initializeTheme);

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <main>{user ? <TodoList /> : <LoginForm />}</main>
      <Analytics />
      <SpeedInsights route={user ? '/todo' : '/login'} />
    </Suspense>
  );
};

export default App;
