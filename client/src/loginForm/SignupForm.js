import { useState } from 'react';
import Swal from 'sweetalert2';

import './loginForm.css';

function SignupForm({ onSignupComplete }) {
  // Validation 메세지 state
  const [idError, setIdError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [emailError, setEmailError] = useState('');

  const [profileImage, setProfileImage] = useState(null);
  const [profileImageFile, setProfileImageFile] = useState(null);
  function handleImageChange(e) {
    const file = e.target.files[0];
    if (file) {
      setProfileImageFile(file);
      const reader = new FileReader();

      reader.onloadend = function () {
        setProfileImage(reader.result);
      };

      reader.readAsDataURL(file);
    }
  }

  //아이디 입력 handler
  const [userId, setUserId] = useState('');
  function userIdChangeHandler(e) {
    //아이디 변경시 아이디 중복체크 관련 초기화
    setIsIdDuplicated(false);
    setIdDuplicatedResult('');

    const idValue = e.target.value;

    if (idValue && idValue.length <= 40) {
      setIdError('');
      setUserId(idValue);
    } else {
      setIdError('아이디를 확인해주세요.');
      setUserId('');
    }
  }

  //아이디 중복체크 버튼 클릭
  const [isIdDuplicated, setIsIdDuplicated] = useState(false);
  const [idDuplicatedResult, setIdDuplicatedResult] = useState('');
  async function checkIdDuplicated() {
    if (!userId) {
      setIdError('ID를 입력해주세요.');
      return;
    }

    setIdError('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await fetch(`${apiUrl}/user/duplicate/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        setIsIdDuplicated(data);

        if (!data) {
          //중복된 아이디 없음
          setIdDuplicatedResult('사용하실 수 있는 아이디입니다.');
        } else {
          setIdDuplicatedResult('중복된 아이디가 있습니다.');
        }
      } else {
        // 비정상 응답 처리
        Swal.fire('아이디 중복체크 실패', '서버 오류가 발생했습니다.', 'error');
      }
    } catch (error) {
      // 네트워크 오류 처리
      console.error('SignupForm Error : ', error);
      Swal.fire('오류 발생', '서버와의 연결에 문제가 발생했습니다.', 'error');
    }
  }

  //비밀번호 입력 handler
  const [userPassword, setUserPassword] = useState('');
  function userPasswordChangeHandler(e) {
    const passwordValue = e.target.value;
    setUserPassword(passwordValue);
  }

  //비밀번호 확인 입력 handler
  const [confirmUserPassword, setConfirmUserPassword] = useState('');
  function confirmUserPasswordChangeHandler(e) {
    const confirmPasswordValue = e.target.value;

    if (userPassword !== confirmPasswordValue) {
      setConfirmPasswordError('비밀번호를 다시 한번 확인해주세요.');
      setConfirmUserPassword('');
    } else {
      setConfirmPasswordError('');
      setConfirmUserPassword(confirmPasswordValue);
    }
  }

  //이름 입력 handler
  const [userName, setUserName] = useState('');
  function userNameChangeHandler(e) {
    const nameValue = e.target.value;
    setUserName(nameValue);
  }

  //이메일 입력 handler
  const [userEmail, setUserEmail] = useState('');
  function emailChangeHandler(e) {
    const emailValue = e.target.value;

    if (!emailValue || !/[a-z0-9]+@[a-z]+\.[a-z]{2,3}/.test(emailValue)) {
      setEmailError('이메일을 확인해주세요.');
      setUserEmail('');
    } else {
      setEmailError('');
      setUserEmail(emailValue);
    }
  }

  //추가설명 입력 handler
  const [userDescription, setUserDescription] = useState('');
  function userDescriptionChangeHandler(e) {
    const descriptionValue = e.target.value;
    setUserDescription(descriptionValue);
  }

  //회원가입 form submit
  function submitSignupHandler(e) {
    e.preventDefault();

    const validationResult = validateSignupForm(); //유효성체크

    if (validationResult) {
      submitSignup(); //회원가입 정보 전송
    }
  }

  //회원가입 form validation
  function validateSignupForm() {
    //아이디
    if (!userId || userId.length > 40) {
      setIdError('아이디를 확인해주세요.');
      return false;
    }

    if (isIdDuplicated) {
      setIdError('아이디 중복체크를 진행해주세요.');
      return false;
    }

    if (!userPassword) {
      setPasswordError('비밀번호를 확인해주세요.');
      return false;
    }

    if (!confirmUserPassword || userPassword !== confirmUserPassword) {
      setConfirmPasswordError('비밀번호를 다시 한번 확인해주세요.');
      return false;
    }

    if (!userName) {
      return false;
    }

    if (!userEmail || !/[a-z0-9]+@[a-z]+\.[a-z]{2,3}/.test(userEmail)) {
      setEmailError('이메일을 확인해주세요.');
      return false;
    }

    return true;
  }

  //회원가입 정보 전송
  async function submitSignup() {
    const signupFormData = new FormData();

    signupFormData.append('userId', userId);
    signupFormData.append('userName', userName);
    signupFormData.append('userPassword', userPassword);
    signupFormData.append('userEmail', userEmail);
    signupFormData.append('userDescription', userDescription);
    if (profileImageFile)
      signupFormData.append('profileImage', profileImageFile);

    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await fetch(`${apiUrl}/user/signup`, {
        method: 'POST',
        body: signupFormData,
      });

      if (response.ok) {
        const data = await response.json();

        if (data.userSeq) {
          Swal.fire('', '회원가입되었습니다.', 'success').then(() => {
            onSignupComplete();
          });
        } else {
          console.error('회원가입 실패 : ', data);
          Swal.fire('', '회원가입에 실패했습니다.', 'error');
        }
      } else {
        // 비정상 응답 처리
        Swal.fire('회원가입 실패', '서버 오류가 발생했습니다.', 'error');
      }
    } catch (error) {
      // 네트워크 오류 처리
      console.error('SignupForm Error : ', error);
      Swal.fire('오류 발생', '서버와의 연결에 문제가 발생했습니다.', 'error');
    }
  }

  // 취소 시
  function onCancel() {
    Swal.fire({
      title: '정말 취소하시겠습니까?',
      text: '작성중인 내용이 사라집니다.',
      icon: 'warning',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonColor: '#0d6efd',
      cancelButtonColor: '#6C757D',
      confirmButtonText: '확인',
      cancelButtonText: '취소',
    }).then((result) => {
      if (result.isConfirmed) {
        // 로그인 화면으로
        onSignupComplete();
      }
    });
  }

  return (
    <div className="signup-container">
      <h2>회원가입</h2>
      <form onSubmit={submitSignupHandler}>
        {/* ID */}
        <div className="form-group row mb-3">
          <label htmlFor="userId" className="col-3 col-form-label">
            ID <span className="text-danger">*</span>
          </label>
          <div className="col-9">
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                id="userId"
                placeholder="아이디를 40자 이내로 입력해주세요."
                autoComplete="off"
                onChange={userIdChangeHandler}
                required
                length={40}
                spellCheck="false"
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={checkIdDuplicated}
              >
                중복체크
              </button>
            </div>
            <small className="text-danger">{idError}</small>
            <small className={isIdDuplicated ? 'text-danger' : ''}>
              {idDuplicatedResult}
            </small>
          </div>
        </div>

        {/* 비밀번호 */}
        <div className="form-group row mb-3">
          <label htmlFor="userPassword" className="col-3 col-form-label">
            비밀번호 <span className="text-danger">*</span>
          </label>
          <div className="col-9">
            <input
              type="password"
              className="form-control"
              id="userPassword"
              placeholder="비밀번호를 입력해주세요."
              autoComplete="off"
              onChange={userPasswordChangeHandler}
              required
            />
            <small className="text-danger">{passwordError}</small>
          </div>
        </div>

        {/* 비밀번호 확인 */}
        <div className="form-group row mb-3">
          <label htmlFor="confirmUserPassword" className="col-3 col-form-label">
            비밀번호 확인 <span className="text-danger">*</span>
          </label>
          <div className="col-9">
            <input
              type="password"
              className="form-control"
              id="confirmUserPassword"
              placeholder="비밀번호를 다시 입력해주세요."
              autoComplete="off"
              onChange={confirmUserPasswordChangeHandler}
              required
            />
            <small className="text-danger">{confirmPasswordError}</small>
          </div>
        </div>

        {/* 이름 */}
        <div className="form-group row mb-3">
          <label htmlFor="userId" className="col-3 col-form-label">
            이름 <span className="text-danger">*</span>
          </label>
          <div className="col-9">
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                id="userName"
                placeholder="이름을 입력해주세요."
                autoComplete="off"
                onChange={userNameChangeHandler}
                required
                length={200}
                spellCheck="false"
              />
            </div>
            <small className="text-danger">{/*nameError*/}</small>
          </div>
        </div>

        {/* 이메일 */}
        <div className="form-group row mb-3">
          <label htmlFor="userEmail" className="col-3 col-form-label">
            이메일 <span className="text-danger">*</span>
          </label>
          <div className="col-9">
            <input
              type="email"
              className="form-control"
              id="userEmail"
              placeholder="이메일을 입력해주세요."
              autoComplete="off"
              onChange={emailChangeHandler}
              required
              spellCheck="false"
            />
            <small className="text-danger">{emailError}</small>
          </div>
        </div>

        {/* 프로필 이미지 업로드 */}
        <div className="form-group row mb-3">
          <label htmlFor="profileImage" className="col-3 col-form-label">
            프로필 이미지
          </label>
          <div className="col-9">
            <input
              type="file"
              className="form-control"
              id="profileImage"
              accept="image/*"
              onChange={handleImageChange}
            />
          </div>
        </div>

        {/* 이미지 미리보기 */}
        {profileImage && (
          <div className="form-group row mb-3">
            <label className="col-3 col-form-label"></label>
            <div className="col-9">
              <img
                src={profileImage}
                alt="프로필 미리보기"
                style={{ width: '100px', height: '100px', objectFit: 'cover' }}
              />
            </div>
          </div>
        )}

        {/* 추가 설명 */}
        <div className="form-group row mb-3">
          <label htmlFor="userDescription" className="col-3 col-form-label">
            추가 설명
          </label>
          <div className="col-9">
            <textarea
              className="form-control"
              id="userDescription"
              rows="3"
              placeholder="추가 설명을 입력해주세요."
              style={{ resize: 'none' }}
              onChange={userDescriptionChangeHandler}
              spellCheck="false"
            ></textarea>
          </div>
        </div>

        <div className="row">
          {/* 취소 버튼 */}
          <div className="col-3">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              취소
            </button>
          </div>
          {/* 회원가입 버튼 */}
          <div className="col-9">
            <button type="submit" className="btn btn-primary">
              회원가입
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default SignupForm;
