import { useAuthStore } from './authStore/authStore';
import LoginForm from './loginForm/LoginForm';
import TodoList from './todoList/TodoList';
import './App.css';

function App() {
  const { user } = useAuthStore();

  return <>{user ? <TodoList /> : <LoginForm />}</>;
}

export default App;