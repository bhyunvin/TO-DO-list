import { AuthProvider, useAuth } from './authContext/AuthContext';
import LoginForm from './loginForm/LoginForm';
import TodoList from './todoList/TodoList';

import './App.css';

function MainComponent() {
  const { user } = useAuth();

  return <>{user ? <TodoList /> : <LoginForm />}</>;
}

function App() {
  return (
    <AuthProvider>
      <MainComponent />
    </AuthProvider>
  );
}

export default App;
