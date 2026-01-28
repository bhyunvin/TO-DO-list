import { useState } from 'react';
import 'sweetalert2/dist/sweetalert2.min.css';
import { showAlert, showErrorAlert, showToast } from '../utils/alertUtils';
import authService from '../api/authService';
import { useFileUploadValidator } from '../hooks/useFileUploadValidator';
import { useFileUploadProgress } from '../hooks/useFileUploadProgress';
import PropTypes from 'prop-types';
import FileUploadProgress from '../components/FileUploadProgress';
import { getPasswordStrength, PASSWORD_CRITERIA } from '../utils/passwordUtils';

import './loginForm.css';

const SignupForm = ({ onSignupComplete }) => {
  const { validateFiles, formatFileSize, getUploadPolicy } =
    useFileUploadValidator();

  const { uploadStatus, uploadProgress, uploadErrors, resetUploadState } =
    useFileUploadProgress();

  const [idError, setIdError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [profileImageError, setProfileImageError] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImageValidation, setProfileImageValidation] = useState(null);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];

    setProfileImage(null);
    setProfileImageFile(null);
    setProfileImageValidation(null);
    setProfileImageError('');

    if (file) {
      const validationResults = validateFiles([file], 'profileImage');
      const validation = validationResults[0];

      setProfileImageValidation(validation);

      if (validation.isValid) {
        setProfileImageFile(file);
        setProfileImageError('');

        const reader = new FileReader();
        reader.onloadend = () => {
          setProfileImage(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setProfileImageError(validation.errorMessage);
        e.target.value = '';
      }
    }
  };

  const [userId, setUserId] = useState('');
  const [isIdDuplicated, setIsIdDuplicated] = useState(false);
  const [idDuplicatedResult, setIdDuplicatedResult] = useState('');

  const userIdChangeHandler = (e) => {
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
  };

  const checkIdDuplicated = async () => {
    if (!userId) {
      setIdError('ID를 입력해주세요.');
      return;
    }

    setIdError('');

    try {
      const isDuplicated = await authService.checkDuplicateId(userId);

      setIsIdDuplicated(isDuplicated);

      if (isDuplicated) {
        setIdDuplicatedResult('중복된 아이디가 있습니다.');
      } else {
        setIdDuplicatedResult('사용하실 수 있는 아이디입니다.');
      }
    } catch (error) {
      console.error('SignupForm Error : ', error);
      showErrorAlert('오류 발생', '서버와의 연결에 문제가 발생했습니다.');
    }
  };

  const [userPassword, setUserPassword] = useState('');
  const [confirmUserPassword, setConfirmUserPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userDescription, setUserDescription] = useState('');

  const userPasswordChangeHandler = (e) => {
    const passwordValue = e.target.value;
    setUserPassword(passwordValue);

    // 실시간 유효성 검사
    if (passwordValue.trim()) {
      if (passwordValue.length < PASSWORD_CRITERIA.MIN_LENGTH) {
        setPasswordError(
          `비밀번호는 최소 ${PASSWORD_CRITERIA.MIN_LENGTH}자 이상이어야 합니다.`,
        );
      } else if (PASSWORD_CRITERIA.SPECIAL_CHAR_REGEX.test(passwordValue)) {
        setPasswordError('');
      } else {
        setPasswordError(
          '비밀번호는 특수문자(@$!%*?&)를 하나 이상 포함해야 합니다.',
        );
      }
    } else {
      setPasswordError('비밀번호를 입력해주세요.');
    }

    // 비밀번호 확인 재검증
    if (confirmUserPassword) {
      if (passwordValue === confirmUserPassword) {
        setConfirmPasswordError('');
      } else {
        setConfirmPasswordError('비밀번호가 일치하지 않습니다.');
      }
    }
  };

  const confirmUserPasswordChangeHandler = (e) => {
    const confirmPasswordValue = e.target.value;

    if (userPassword === confirmPasswordValue) {
      setConfirmPasswordError('');
      setConfirmUserPassword(confirmPasswordValue);
    } else {
      setConfirmPasswordError('비밀번호를 다시 한번 확인해주세요.');
      setConfirmUserPassword('');
    }
  };

  const userNameChangeHandler = (e) => {
    const nameValue = e.target.value;
    setUserName(nameValue);
  };

  const emailChangeHandler = (e) => {
    const emailValue = e.target.value;

    if (!emailValue || !/[a-z0-9]+@[a-z]+\.[a-z]{2,3}/.test(emailValue)) {
      setEmailError('이메일을 확인해주세요.');
      setUserEmail('');
    } else {
      setEmailError('');
      setUserEmail(emailValue);
    }
  };

  const userDescriptionChangeHandler = (e) => {
    const descriptionValue = e.target.value;
    setUserDescription(descriptionValue);
  };

  const submitSignupHandler = async (e) => {
    e.preventDefault();

    const validationResult = validateSignupForm();

    if (validationResult) {
      setIsSubmitting(true);
      try {
        await submitSignup();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const validateSignupForm = () => {
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

    if (userPassword.length < PASSWORD_CRITERIA.MIN_LENGTH) {
      setPasswordError(
        `비밀번호는 최소 ${PASSWORD_CRITERIA.MIN_LENGTH}자 이상이어야 합니다.`,
      );
      return false;
    }

    if (!PASSWORD_CRITERIA.SPECIAL_CHAR_REGEX.test(userPassword)) {
      setPasswordError(
        '비밀번호는 특수문자(@$!%*?&)를 하나 이상 포함해야 합니다.',
      );
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

    if (
      profileImageFile &&
      profileImageValidation &&
      !profileImageValidation.isValid
    ) {
      setProfileImageError(profileImageValidation.errorMessage);
      return false;
    }

    if (!privacyAgreed) {
      showToast({
        title: '개인정보 수집 및 이용에 동의해주세요.',
        icon: 'warning',
        timer: 3000,
      });
      return false;
    }

    return true;
  };

  const submitSignup = async () => {
    const signupFormData = new FormData();

    signupFormData.append('userId', userId);
    signupFormData.append('userName', userName);
    signupFormData.append('userPassword', userPassword);
    signupFormData.append('userEmail', userEmail);
    signupFormData.append('userDescription', userDescription);
    if (profileImageFile)
      signupFormData.append('profileImage', profileImageFile);

    signupFormData.append('privacyAgreed', String(privacyAgreed));

    try {
      const data = await authService.signup(signupFormData);

      if (data.userSeq) {
        showAlert({
          title: '회원가입 완료!',
          html: `
              <div class="text-center">
                <p><strong>환영합니다, ${userName}님!</strong></p>
                <p>회원가입이 성공적으로 완료되었습니다.</p>
                ${profileImageFile ? `<p>✓ 프로필 이미지가 업로드되었습니다.</p>` : ''}
              </div>
            `,
          icon: 'success',
          confirmButtonText: '로그인하기',
        }).then(() => {
          resetUploadState();
          onSignupComplete();
        });
      } else {
        console.error('회원가입 실패 : ', data);
        showErrorAlert('', '회원가입에 실패했습니다.');
      }
    } catch (error) {
      console.error('SignupForm Error : ', error);

      // authService/apiClient 에러 처리: 에러 응답이 있으면 data 사용
      if (error.response?.data) {
        const errorData = error.response.data;

        if (errorData.errors && Array.isArray(errorData.errors)) {
          const errorMessages = errorData.errors
            .map((err) => `${err.fileName}: ${err.errorMessage}`)
            .join('<br>');

          showAlert({
            title: '파일 업로드 오류',
            html: errorMessages,
            icon: 'error',
          });
        } else {
          showErrorAlert(
            '회원가입 실패',
            errorData.message || '서버 오류가 발생했습니다.',
          );
        }
      } else {
        showErrorAlert('오류 발생', '서버와의 연결에 문제가 발생했습니다.');
      }
    }
  };

  const onCancel = () => {
    showAlert({
      title: '정말 취소하시겠습니까?',
      text: '작성중인 내용이 사라집니다.',
      icon: 'warning',
      showCancelButton: true,
      reverseButtons: true, // 버튼 순서 반전: (취소 | 확인)
      confirmButtonColor: 'transparent',
      cancelButtonColor: 'transparent',
      customClass: {
        confirmButton: 'btn btn-outline-primary',
        cancelButton: 'btn btn-outline-adaptive me-2',
      },
      buttonsStyling: false,
      confirmButtonText: '확인',
      cancelButtonText: '계속 작성',
    }).then((result) => {
      if (result.isConfirmed) {
        onSignupComplete();
      }
    });
  };

  const getFileInputClass = () => {
    if (profileImageError) return 'form-control is-invalid';
    if (profileImageValidation?.isValid) return 'form-control is-valid';
    return 'form-control';
  };

  const getSignupButtonText = () => {
    if (uploadStatus === 'uploading') return '이미지 업로드 중...';
    if (uploadStatus === 'validating') return '파일 검증 중...';
    return '가입 중...';
  };

  const passwordStrength = getPasswordStrength(userPassword);

  const showPrivacyPolicy = () => {
    showAlert({
      title: '개인정보 처리방침',
      html: `
        <div style="text-align: left; max-height: 400px; overflow-y: auto; font-size: 0.9rem; line-height: 1.6;">
          <p><strong>제1조 (목적)</strong><br/>
          본 방침은 'My Todo App'(이하 '회사')이 제공하는 서비스 이용과 관련하여 회원의 개인정보를 보호하고, 이와 관련된 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 수립되었습니다.</p>
          
          <hr style="margin: 10px 0; border: 0; border-top: 1px solid #eee;">

          <p><strong>제2조 (수집하는 개인정보의 항목)</strong><br/>
          회사는 회원가입 및 서비스 이용 과정에서 아래와 같은 개인정보를 수집합니다.<br/>
          <ul style="margin: 5px 0 10px 20px; padding: 0;">
            <li><strong>필수항목:</strong> 아이디, 비밀번호, 이름, 이메일</li>
            <li><strong>선택항목:</strong> 프로필 이미지, 사용자 설명, AI API Key</li>
            <li><strong>자동수집:</strong> 접속 IP 정보, 서비스 이용기록, 쿠키 (부정 이용 방지 및 감사 목적)</li>
          </ul>
          </p>
          
          <hr style="margin: 10px 0; border: 0; border-top: 1px solid #eee;">

          <p><strong>제3조 (개인정보의 보유 및 이용기간)</strong><br/>
          회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 보안 및 감사 목적으로 아래의 정보는 명시된 기간 동안 보존합니다.<br/>
          <ul style="margin: 5px 0 10px 20px; padding: 0;">
            <li><strong>접속 로그 및 IP 정보:</strong> <span style="color: #d63384; font-weight: bold;">6개월</span> (통신비밀보호법 및 보안 감사)</li>
            <li><strong>회원 정보:</strong> 회원 탈퇴 시까지</li>
          </ul>
          </p>

          <hr style="margin: 10px 0; border: 0; border-top: 1px solid #eee;">

          <p><strong>제4조 (개인정보의 암호화 및 보호 조치)</strong><br/>
          회사는 이용자의 개인정보를 안전하게 보호하기 위해 주요 정보를 암호화하여 저장합니다.<br/>
          <ul style="margin: 5px 0 10px 20px; padding: 0;">
            <li><strong>암호화 저장 항목:</strong> <span style="font-weight: bold; color: #0d6efd;">비밀번호, 이메일, AI API Key</span></li>
            <li><strong>통신 구간 암호화:</strong> 전체 서비스 구간에 SSL(HTTPS)을 적용하여 데이터를 안전하게 전송합니다.</li>
          </ul>
          </p>

          <hr style="margin: 10px 0; border: 0; border-top: 1px solid #eee;">

          <p><strong>제5조 (개인정보의 파기절차 및 방법)</strong><br/>
          <ul style="margin: 5px 0 10px 20px; padding: 0;">
            <li><strong>파기절차:</strong> 보유 기간(6개월)이 경과한 로그 및 IP 정보는 자동화된 시스템에 의해 영구 삭제됩니다.</li>
            <li><strong>파기방법:</strong> DB에 저장된 데이터는 복구할 수 없는 방법으로 삭제하며, 파일 형태의 기록은 재생 불가능한 기술적 방법을 사용하여 삭제합니다.</li>
          </ul>
          </p>
        </div>
      `,
      width: '600px',
      confirmButtonText: '확인',
      confirmButtonColor: '#0d6efd', // Bootstrap primary color 예시
      scrollbarPadding: false,
      customClass: {
        htmlContainer: 'text-start',
        popup: 'swal2-privacy-popup', // 필요시 css 커스텀을 위해 클래스 추가
      },
    });
  };

  return (
    <div className="signup-container">
      <h2>회원가입</h2>
      <form onSubmit={submitSignupHandler}>
        {/* 아이디 */}
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
                maxLength={40}
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
              className={`form-control ${passwordError ? 'is-invalid' : ''}`}
              id="userPassword"
              placeholder="비밀번호를 입력해주세요."
              autoComplete="off"
              onChange={userPasswordChangeHandler}
              required
            />
            {passwordError && (
              <small className="invalid-feedback">{passwordError}</small>
            )}
            {userPassword && !passwordError && (
              <div className={`text-${passwordStrength.color} mt-1`}>
                <small>
                  비밀번호 강도: <strong>{passwordStrength.text}</strong>
                  <div className="progress mt-1" style={{ height: '4px' }}>
                    <div
                      className={`progress-bar bg-${passwordStrength.color}`}
                      style={{
                        width: `${(passwordStrength.strength / 6) * 100}%`,
                      }}
                    ></div>
                  </div>
                </small>
              </div>
            )}
            <small className="form-text text-muted">
              8자 이상, 특수문자(@$!%*?&) 하나 이상 포함
            </small>
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
              className={`form-control ${confirmPasswordError ? 'is-invalid' : ''}`}
              id="confirmUserPassword"
              placeholder="비밀번호를 다시 입력해주세요."
              autoComplete="off"
              onChange={confirmUserPasswordChangeHandler}
              required
            />
            {confirmPasswordError && (
              <small className="invalid-feedback">{confirmPasswordError}</small>
            )}
            {confirmUserPassword &&
              !confirmPasswordError &&
              userPassword === confirmUserPassword && (
                <div className="valid-feedback d-block">
                  ✓ 비밀번호가 일치합니다.
                </div>
              )}
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
              className={getFileInputClass()}
              id="profileImage"
              accept="image/*"
              onChange={handleImageChange}
            />
            <small className="form-text text-muted">
              허용 파일: JPG, JPEG, PNG, GIF, WEBP | 최대 크기:{' '}
              {formatFileSize(getUploadPolicy('profileImage')?.maxSize || 0)}
            </small>
            {profileImageError && (
              <div className="text-danger mt-1">
                <small>{profileImageError}</small>
              </div>
            )}
            {profileImageValidation?.isValid && (
              <div className="text-success mt-1">
                <small>
                  ✓ 유효한 이미지 파일입니다 (
                  {formatFileSize(profileImageFile?.size || 0)})
                </small>
              </div>
            )}
          </div>
        </div>

        {/* 이미지 미리보기 및 업로드 상태 */}
        {profileImage && profileImageValidation?.isValid && (
          <div className="form-group row mb-3">
            <div className="col-3 col-form-label">미리보기</div>
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
                    borderRadius: '8px',
                  }}
                />
                <div className="ms-3">
                  <div className="text-success">
                    <small>
                      <strong>{profileImageFile?.name}</strong>
                      <br />
                      크기: {formatFileSize(profileImageFile?.size || 0)}
                      <br />
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
            <div className="col-3 col-form-label">업로드 상태</div>
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
                    const validationResults = validateFiles(
                      [file],
                      'profileImage',
                    );
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
              rows={3}
              placeholder="추가 설명을 입력해주세요."
              style={{ resize: 'none' }}
              onChange={userDescriptionChangeHandler}
              spellCheck="false"
            ></textarea>
          </div>
        </div>

        {/* 개인정보 처리방침 동의 */}
        <div className="form-group row mb-3">
          <div className="col-3"></div>
          <div className="col-9">
            <div className="form-check d-flex align-items-center">
              <input
                className="form-check-input me-2"
                type="checkbox"
                id="privacyAgreement"
                checked={privacyAgreed}
                onChange={(e) => setPrivacyAgreed(e.target.checked)}
              />
              <label
                className="form-check-label me-2"
                htmlFor="privacyAgreement"
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                [필수] 개인정보 수집 및 이용에 동의합니다.
              </label>
              <button
                type="button"
                className="btn btn-sm btn-link p-0 text-decoration-none"
                onClick={showPrivacyPolicy}
              >
                [내용 보기]
              </button>
            </div>
          </div>
        </div>

        <div className="row">
          {/* 취소 버튼 */}
          <div className="col-3">
            <button
              type="button"
              className="btn btn-outline-adaptive w-100"
              onClick={onCancel}
              disabled={
                isSubmitting ||
                uploadStatus === 'uploading' ||
                uploadStatus === 'validating'
              }
            >
              취소
            </button>
          </div>
          {/* 회원가입 버튼 */}
          <div className="col-9">
            <button
              type="submit"
              className="btn btn-outline-primary w-100"
              disabled={
                isSubmitting ||
                uploadStatus === 'uploading' ||
                uploadStatus === 'validating'
              }
            >
              {isSubmitting ||
              uploadStatus === 'uploading' ||
              uploadStatus === 'validating' ? (
                <>
                  <output
                    className="spinner-border spinner-border-sm me-2"
                    aria-hidden="true"
                  ></output>
                  {getSignupButtonText()}
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
};

export default SignupForm;

SignupForm.propTypes = {
  onSignupComplete: PropTypes.func.isRequired,
};
