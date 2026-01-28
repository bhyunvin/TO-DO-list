import { useState } from 'react';
import 'sweetalert2/dist/sweetalert2.min.css';
import { showWarningAlert, showErrorAlert } from '../utils/alertUtils';
import authService from '../api/authService';
import SignupForm from './SignupForm';

import './loginForm.css';

const LoginForm = () => {
  const [authMode, setAuthMode] = useState('');
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const idChangeHandler = (e) => {
    setId(e.target.value);
  };

  const passwordChangeHandler = (e) => {
    setPassword(e.target.value);
  };

  const submitLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!id) {
      showWarningAlert('', '아이디를 입력해주세요.');
      setIsLoading(false);
      return;
    }

    if (!password) {
      showWarningAlert('', '비밀번호를 입력해주세요.');
      setIsLoading(false);
      return;
    }

    try {
      const data = await authService.login(
        String(id).trim(),
        String(password).trim(),
      );

      // data 구조: { accessToken, user }
      if (!data?.accessToken) {
        let errorMsg = '다시 시도해 주세요.';
        if (data && typeof data === 'object' && 'message' in data) {
          const msg = (data as { message: unknown }).message;
          if (typeof msg === 'string') errorMsg = msg;
        }
        showErrorAlert('로그인 실패', errorMsg);
      }
    } catch (error) {
      console.error('LoginForm Login Error : ', error);

      const { response } = error;
      if (response?.status === 204) {
        showErrorAlert('로그인 실패', '사용자가 존재하지 않습니다.');
      } else if (response?.data) {
        showErrorAlert(
          '로그인 실패',
          response.data.message || '다시 시도해 주세요.',
        );
      } else {
        showErrorAlert('오류 발생', '서버와의 연결에 문제가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
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
        <div className="form-group mb-3">
          <label htmlFor="inputID">ID</label>
          <input
            type="text"
            className="form-control"
            id="inputID"
            placeholder="아이디를 입력해주세요."
            autoComplete="username"
            onChange={idChangeHandler}
            spellCheck="false"
            value={id}
          />
        </div>
        <div className="form-group mb-4">
          <label htmlFor="inputPassword">비밀번호</label>
          <input
            type="password"
            className="form-control"
            id="inputPassword"
            placeholder="비밀번호를 입력해주세요."
            autoComplete="current-password"
            onChange={passwordChangeHandler}
            spellCheck="false"
            value={password}
          />
        </div>
        <div className="d-grid gap-2">
          <button
            type="submit"
            className="btn btn-outline-primary"
            disabled={isLoading || !id || !password}
          >
            {isLoading ? (
              <>
                <output
                  className="spinner-border spinner-border-sm me-2"
                  aria-hidden="true"
                ></output>{' '}
                로그인 중...
              </>
            ) : (
              '로그인'
            )}
          </button>
          <button
            type="button"
            className="btn btn-outline-adaptive"
            onClick={handleSignup}
            disabled={isLoading}
          >
            회원가입
          </button>
        </div>
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
