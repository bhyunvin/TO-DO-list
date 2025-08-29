import { useAuthStore } from './authStore/authStore';
import LoginForm from './loginForm/LoginForm';
import TodoList from './todoList/TodoList';
import './App.css';

// 이제 MainComponent 하나만 있으면 됩니다.
function App() {
  // 스토어에서 user 상태를 직접 가져옵니다.
  const { user } = useAuthStore();

  return <>{user ? <TodoList /> : <LoginForm />}</>;
}

export default App;