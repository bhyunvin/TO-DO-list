import { useState } from 'react';
import Swal from 'sweetalert2';
import { useAuthStore } from '../authStore/authStore';
import authService from '../api/authService';
import SignupForm from './SignupForm';

import './loginForm.css';

const LoginForm = () => {
  const [authMode, setAuthMode] = useState('');
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');

  const { login } = useAuthStore();

  const idChangeHandler = (e) => {
    setId(e.target.value);
  };

  const passwordChangeHandler = (e) => {
    setPassword(e.target.value);
  };

  const submitLogin = async (e) => {
    e.preventDefault();

    if (!id) {
      Swal.fire('', '아이디를 입력해주세요.', 'warning');
      return;
    }

    if (!password) {
      Swal.fire('', '비밀번호를 입력해주세요.', 'warning');
      return;
    }

    try {
      // authService.login 사용
      const data = await authService.login(
        String(id).trim(),
        String(password).trim(),
      );

      if (data.userSeq) {
        login(data);
      } else {
        // 204 No Content나 다른 상태는 axios catch 블록으로 가거나 여기서 처리
        Swal.fire(
          '로그인 실패',
          data.message || '다시 시도해 주세요.',
          'error',
        );
      }
    } catch (error) {
      console.error('LoginForm Login Error : ', error);

      const { response } = error;
      if (response && response.status === 204) {
        Swal.fire('로그인 실패', '사용자가 존재하지 않습니다.', 'error');
      } else if (response && response.data) {
        Swal.fire(
          '로그인 실패',
          response.data.message || '다시 시도해 주세요.',
          'error',
        );
      } else {
        Swal.fire('오류 발생', '서버와의 연결에 문제가 발생했습니다.', 'error');
      }
    }
  };

  const handleSignup = () => {
    setAuthMode('signup');
  };

  const handleSignupComplete = () => {
    setAuthMode('login');
  };

  let resultComponent = (
    <div className="login-container">
      <h2>TO-DO</h2>
      <form onSubmit={submitLogin}>
        <div className="form-group">
          <label htmlFor="inputID" className="mb-1">
            ID
          </label>
          <input
            type="text"
            className="form-control mb-3"
            id="inputID"
            placeholder="아이디를 입력해주세요."
            autoComplete="on"
            onChange={idChangeHandler}
            spellCheck="false"
          />
        </div>
        <div className="form-group">
          <label htmlFor="inputPassword" className="mb-1">
            비밀번호
          </label>
          <input
            type="password"
            className="form-control mb-3"
            id="inputPassword"
            placeholder="비밀번호를 입력해주세요."
            autoComplete="off"
            onChange={passwordChangeHandler}
            spellCheck="false"
          />
        </div>
        <button type="submit" className="btn btn-primary mt-3">
          로그인
        </button>
        <button
          type="button"
          className="btn btn-secondary mt-3 full-width"
          onClick={handleSignup}
        >
          회원가입
        </button>
      </form>
    </div>
  );

  switch (authMode) {
    case 'login':
      break;
    case 'signup':
      resultComponent = <SignupForm onSignupComplete={handleSignupComplete} />;
      break;
    default:
      break;
  }

  return resultComponent;
};

export default LoginForm;
