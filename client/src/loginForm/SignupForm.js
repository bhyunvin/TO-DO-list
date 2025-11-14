import { useState } from 'react';
import Swal from 'sweetalert2';
import { useAuthStore } from '../authStore/authStore';
import { useFileUploadValidator } from '../hooks/useFileUploadValidator';
import { useFileUploadProgress } from '../hooks/useFileUploadProgress';
import FileUploadProgress from '../components/FileUploadProgress';

import './loginForm.css';

function SignupForm({ onSignupComplete }) {
  const { api } = useAuthStore(); // api 함수 가져오기
  const { 
    validateFiles, 
    formatFileSize, 
    getUploadPolicy, 
  } = useFileUploadValidator();
  
  const {
    uploadStatus,
    uploadProgress,
    uploadErrors,
    resetUploadState,
  } = useFileUploadProgress();
  
  // Validation 메세지 state
  const [idError, setIdError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [profileImageError, setProfileImageError] = useState('');

  const [profileImage, setProfileImage] = useState(null);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImageValidation, setProfileImageValidation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  function handleImageChange(e) {
    const file = e.target.files[0];
    
    // 이전 상태 초기화
    setProfileImage(null);
    setProfileImageFile(null);
    setProfileImageValidation(null);
    setProfileImageError('');
    
    if (file) {
      // 파일 유효성 검사
      const validationResults = validateFiles([file], 'profileImage');
      const validation = validationResults[0];
      
      setProfileImageValidation(validation);
      
      if (validation.isValid) {
        setProfileImageFile(file);
        setProfileImageError('');
        
        // 미리보기 생성
        const reader = new FileReader();
        reader.onloadend = function () {
          setProfileImage(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setProfileImageError(validation.errorMessage);
        // 파일 입력 초기화
        e.target.value = '';
      }
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
      const response = await api(`/api/user/duplicate/${userId}`, {
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
  async function submitSignupHandler(e) {
    e.preventDefault();

    const validationResult = validateSignupForm(); //유효성체크

    if (validationResult) {
      setIsSubmitting(true);
      try {
        await submitSignup(); //회원가입 정보 전송
      } finally {
        setIsSubmitting(false);
      }
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

    // 프로필 이미지가 제공된 경우 유효성 검사
    if (profileImageFile && profileImageValidation && !profileImageValidation.isValid) {
      setProfileImageError(profileImageValidation.errorMessage);
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
      const response = await api(`/api/user/signup`, {
        method: 'POST',
        body: signupFormData,
      });

      if (response.ok) {
        const data = await response.json();

        if (data.userSeq) {
          Swal.fire({
            title: '회원가입 완료!',
            html: `
              <div class="text-center">
                <p><strong>환영합니다, ${userName}님!</strong></p>
                <p>회원가입이 성공적으로 완료되었습니다.</p>
                ${profileImageFile ? `<p>✓ 프로필 이미지가 업로드되었습니다.</p>` : ''}
              </div>
            `,
            icon: 'success',
            confirmButtonText: '로그인하기'
          }).then(() => {
            resetUploadState();
            onSignupComplete();
          });
        } else {
          console.error('회원가입 실패 : ', data);
          Swal.fire('', '회원가입에 실패했습니다.', 'error');
        }
      } else {
        // 서버 유효성 검사 오류 처리
        const errorData = await response.json().catch(() => ({}));
        
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const errorMessages = errorData.errors.map(err => 
            `${err.fileName}: ${err.errorMessage}`
          ).join('<br>');
          
          Swal.fire({
            title: '파일 업로드 오류',
            html: errorMessages,
            icon: 'error'
          });
        } else {
          Swal.fire('회원가입 실패', errorData.message || '서버 오류가 발생했습니다.', 'error');
        }
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
                maxLength={40}
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
              maxLength={100}
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
              className={`form-control ${profileImageError ? 'is-invalid' : profileImageValidation?.isValid ? 'is-valid' : ''}`}
              id="profileImage"
              accept="image/*"
              onChange={handleImageChange}
            />
            <small className="form-text text-muted">
              허용 파일: JPG, JPEG, PNG, GIF, WEBP | 최대 크기: {formatFileSize(getUploadPolicy('profileImage')?.maxSize || 0)}
            </small>
            {profileImageError && (
              <div className="text-danger mt-1">
                <small>{profileImageError}</small>
              </div>
            )}
            {profileImageValidation?.isValid && (
              <div className="text-success mt-1">
                <small>✓ 유효한 이미지 파일입니다 ({formatFileSize(profileImageFile?.size || 0)})</small>
              </div>
            )}
          </div>
        </div>

        {/* 이미지 미리보기 및 업로드 상태 */}
        {profileImage && profileImageValidation?.isValid && (
          <div className="form-group row mb-3">
            <label className="col-3 col-form-label">미리보기</label>
            <div className="col-9">
              <div className="d-flex align-items-center">
                <img
                  src={profileImage}
                  alt="프로필 미리보기"
                  style={{ 
                    width: '100px', 
                    height: '100px', 
                    objectFit: 'cover',
                    border: '2px solid #28a745',
                    borderRadius: '8px'
                  }}
                />
                <div className="ms-3">
                  <div className="text-success">
                    <small>
                      <strong>{profileImageFile?.name}</strong><br/>
                      크기: {formatFileSize(profileImageFile?.size || 0)}<br/>
                      상태: 검증 완료 ✓
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 프로필 이미지를 위한 향상된 업로드 진행 상황 */}
        {profileImageFile && (uploadStatus !== 'idle' || isSubmitting) && (
          <div className="form-group row mb-3">
            <label className="col-3 col-form-label">업로드 상태</label>
            <div className="col-9">
              <FileUploadProgress
                files={[profileImageFile]}
                validationResults={[profileImageValidation]}
                uploadProgress={uploadProgress}
                uploadStatus={uploadStatus}
                uploadErrors={uploadErrors}
                showValidation={false}
                showProgress={true}
                showDetailedStatus={true}
                onRetryUpload={async (failedFiles) => {
                  // 프로필 이미지의 경우 유효성 검사만 재설정
                  if (failedFiles.length > 0) {
                    const file = failedFiles[0];
                    const validationResults = validateFiles([file], 'profileImage');
                    setProfileImageValidation(validationResults[0]);
                  }
                }}
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
            <button type="button" className="btn btn-secondary full-width" onClick={onCancel}>
              취소
            </button>
          </div>
          {/* 회원가입 버튼 */}
          <div className="col-9">
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSubmitting || uploadStatus === 'uploading' || uploadStatus === 'validating'}
            >
              {isSubmitting || uploadStatus === 'uploading' || uploadStatus === 'validating' ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {uploadStatus === 'uploading' ? '이미지 업로드 중...' : 
                   uploadStatus === 'validating' ? '파일 검증 중...' : '가입 중...'}
                </>
              ) : (
                '회원가입'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default SignupForm;
