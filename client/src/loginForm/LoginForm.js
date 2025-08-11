import { useState } from 'react';
import Swal from 'sweetalert2';
import { useAuth } from '../authContext/AuthContext';
import SignupForm from './SignupForm';

import './loginForm.css';

function LoginForm() {
  const [authMode, setAuthMode] = useState('');

  const [id, setId] = useState('');
  function idChangeHandler(e) {
    setId(e.target.value);
  }

  const [password, setPassword] = useState('');
  function passwordChangeHandler(e) {
    setPassword(e.target.value);
  }

  const { login } = useAuth();
  async function submitLogin(e) {
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
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await fetch(`${apiUrl}/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: String(id).trim(),
          userPassword: String(password).trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.userSeq) {
          // 로그인 성공
          login(data); // 사용자 정보를 AuthContext에 저장
          Swal.fire('로그인 성공!', '', 'success');
        } else if (response.status === 204) {
          // No content
          Swal.fire('로그인 실패', '사용자가 존재하지 않습니다.', 'error');
        } else {
          // 로그인 실패
          Swal.fire(
            '로그인 실패',
            data.message || '다시 시도해 주세요.',
            'error',
          );
        }
      } else {
        // 비정상 응답 처리
        Swal.fire('로그인 실패', '서버 오류가 발생했습니다.', 'error');
      }
    } catch (error) {
      // 네트워크 오류 처리
      console.error('LoginForm Login Error : ', error);
      Swal.fire('오류 발생', '서버와의 연결에 문제가 발생했습니다.', 'error');
    }
  }

  //회원가입 form 그리기
  function handleSignup(e) {
    setAuthMode('signup');
  }

  //회원가입 완료 이후
  function handleSignupComplete() {
    setAuthMode('login');
  }

  //기본은 loginForm
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
        <button type="submit" className="btn btn-primary mb-3">
          로그인
        </button>
        <span onClick={handleSignup} style={{ cursor: 'pointer' }}>
          회원가입
        </span>
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
}

export default LoginForm;
