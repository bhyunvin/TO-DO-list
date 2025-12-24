/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useFileUploadValidator } from '../hooks/useFileUploadValidator';
import { useFileUploadProgress } from '../hooks/useFileUploadProgress';
import FileUploadProgress from './FileUploadProgress';

/**
 * ProfileUpdateForm 컴포넌트
 * 사용자가 이름, 이메일, 설명 및 프로필 이미지를 포함한 프로필 정보를 업데이트할 수 있도록 합니다
 */
const ProfileUpdateForm = ({
  user,
  onSave,
  onCancel,
  isSubmitting = false,
}) => {
  const { validateFiles, formatFileSize, getUploadPolicy } =
    useFileUploadValidator();

  const { uploadStatus, uploadProgress, uploadErrors, resetUploadState } =
    useFileUploadProgress();

  // 폼 상태
  const [userName, setUserName] = useState(user?.userName || '');
  const [userEmail, setUserEmail] = useState(user?.userEmail || '');

  const [userDescription, setUserDescription] = useState(
    user?.userDescription || '',
  );
  // API Key는 보안상 서버에서 내려주지 않거나 마스킹되어 내려올 수 있음.
  // 여기서는 수정 시에만 입력받는 것으로 처리하거나, 기존 값이 있으면 placeholder로 표시
  const [aiApiKey, setAiApiKey] = useState('');

  // 프로필 이미지 상태
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImageValidation, setProfileImageValidation] = useState(null);

  // 유효성 검사 오류 상태
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [profileImageError, setProfileImageError] = useState('');

  // user prop이 변경될 때 폼을 사용자 데이터로 초기화
  useEffect(() => {
    if (user) {
      setUserName(user.userName || '');
      setUserEmail(user.userEmail || '');
      setUserDescription(user.userDescription || '');
      if (user.profileImage) {
        setProfileImage(user.profileImage);
      }
    }
  }, [user]);

  /**
   * 프로필 이미지 파일 선택 및 유효성 검사 처리
   */
  const handleImageChange = (e) => {
    const file = e.target.files[0];

    // 이전 상태 초기화
    setProfileImage(null);
    setProfileImageFile(null);
    setProfileImageValidation(null);
    setProfileImageError('');

    if (file) {
      // 파일 유효성 검사
      const validationResults = validateFiles([file], 'profileImage');
      const [validation] = validationResults;

      setProfileImageValidation(validation);

      if (validation.isValid) {
        setProfileImageFile(file);
        setProfileImageError('');

        // 미리보기 생성
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfileImage(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setProfileImageError(validation.errorMessage);
        // 파일 입력 초기화
        e.target.value = '';
      }
    }
  };

  /**
   * 유효성 검사와 함께 이름 입력 변경 처리
   */
  const handleNameChange = (e) => {
    const nameValue = e.target.value;
    setUserName(nameValue);

    // 실시간 유효성 검사
    if (!nameValue.trim()) {
      setNameError('이름을 입력해주세요.');
    } else if (nameValue.length > 200) {
      setNameError('이름은 200자 이내로 입력해주세요.');
    } else {
      setNameError('');
    }
  };

  /**
   * 유효성 검사와 함께 이메일 입력 변경 처리
   */
  const handleEmailChange = (e) => {
    const emailValue = e.target.value;
    setUserEmail(emailValue);

    // 실시간 유효성 검사
    if (!emailValue.trim()) {
      setEmailError('이메일을 입력해주세요.');
    } else if (emailValue.length > 100) {
      setEmailError('이메일은 100자 이내로 입력해주세요.');
    } else if (!/^[a-z0-9]+@[a-z]+\.[a-z]{2,3}$/i.test(emailValue)) {
      setEmailError('올바른 이메일 형식을 입력해주세요.');
    } else {
      setEmailError('');
    }
  };

  /**
   * 설명 입력 변경 처리
   */
  const handleDescriptionChange = (e) => {
    const descriptionValue = e.target.value;
    setUserDescription(descriptionValue);
  };

  /**
   * 제출 전 전체 폼 유효성 검사
   */
  const validateForm = () => {
    let isValid = true;

    // 이름 유효성 검사
    if (!userName.trim()) {
      setNameError('이름을 입력해주세요.');
      isValid = false;
    } else if (userName.length > 200) {
      setNameError('이름은 200자 이내로 입력해주세요.');
      isValid = false;
    } else {
      setNameError('');
    }

    // 이메일 유효성 검사
    if (!userEmail.trim()) {
      setEmailError('이메일을 입력해주세요.');
      isValid = false;
    } else if (userEmail.length > 100) {
      setEmailError('이메일은 100자 이내로 입력해주세요.');
      isValid = false;
    } else if (!/^[a-z0-9]+@[a-z]+\.[a-z]{2,3}$/i.test(userEmail)) {
      setEmailError('올바른 이메일 형식을 입력해주세요.');
      isValid = false;
    } else {
      setEmailError('');
    }

    // 프로필 이미지가 제공된 경우 유효성 검사
    if (
      profileImageFile &&
      profileImageValidation &&
      !profileImageValidation.isValid
    ) {
      setProfileImageError(profileImageValidation.errorMessage);
      isValid = false;
    }

    // 설명 길이 유효성 검사
    if (userDescription && userDescription.length > 4000) {
      isValid = false;
    }

    return isValid;
  };

  /**
   * API 통합과 함께 폼 제출 처리
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 폼 유효성 검사
    if (!validateForm()) {
      return;
    }

    // multipart 업로드를 위한 폼 데이터 준비
    const formData = new FormData();
    formData.append('userName', userName.trim());
    formData.append('userEmail', userEmail.trim());
    formData.append('userDescription', userDescription.trim());

    // API Key 추가 (빈 문자열이면 전송하지 않음 -> 기존 값 유지)
    if (aiApiKey && aiApiKey.trim().length > 0) {
      formData.append('aiApiKey', aiApiKey.trim());
    }

    // 선택된 경우 프로필 이미지 추가
    if (profileImageFile) {
      formData.append('profileImage', profileImageFile);
    }

    // 콜백을 위한 프로필 데이터 객체 준비
    const profileData = {
      userName: userName.trim(),
      userEmail: userEmail.trim(),
      userDescription: userDescription.trim(),
      aiApiKey: aiApiKey.trim(),
      profileImageFile,
      formData, // API 호출을 위한 FormData 포함
    };

    try {
      await onSave(profileData);
    } catch (error) {
      console.error('Profile update error:', error);
      // 오류 처리는 부모 컴포넌트에서 수행됨
    }
  };

  /**
   * 확인과 함께 취소 동작 처리
   */
  const handleCancel = () => {
    // 폼이 수정되었는지 확인
    const hasChanges =
      userName !== (user?.userName || '') ||
      userEmail !== (user?.userEmail || '') ||
      userDescription !== (user?.userDescription || '') ||
      userDescription !== (user?.userDescription || '') ||
      (aiApiKey !== '' && aiApiKey.trim().length > 0) ||
      profileImageFile !== null;

    if (hasChanges) {
      Swal.fire({
        title: '정말 취소하시겠습니까?',
        text: '변경사항이 저장되지 않습니다.',
        icon: 'warning',
        showCancelButton: true,
        reverseButtons: true,
        confirmButtonColor: '#0d6efd',
        cancelButtonColor: '#6C757D',
        confirmButtonText: '확인',
        cancelButtonText: '계속 수정',
      }).then((result) => {
        if (result.isConfirmed) {
          resetUploadState();
          onCancel();
        }
      });
    } else {
      resetUploadState();
      onCancel();
    }
  };

  return (
    <div className="profile-update-form">
      <h2>프로필 수정</h2>
      <form onSubmit={handleSubmit}>
        {/* 이름 필드 */}
        <div className="form-group row mb-3">
          <label htmlFor="userName" className="col-3 col-form-label">
            이름 <span className="text-danger">*</span>
          </label>
          <div className="col-9">
            <input
              type="text"
              className={`form-control ${nameError ? 'is-invalid' : userName.trim() ? 'is-valid' : ''}`}
              id="userName"
              placeholder="이름을 입력해주세요."
              value={userName}
              onChange={handleNameChange}
              maxLength={200}
              required
              spellCheck="false"
            />
            {nameError && <div className="invalid-feedback">{nameError}</div>}
          </div>
        </div>

        {/* 이메일 필드 */}
        <div className="form-group row mb-3">
          <label htmlFor="userEmail" className="col-3 col-form-label">
            이메일 <span className="text-danger">*</span>
          </label>
          <div className="col-9">
            <input
              type="email"
              className={`form-control ${emailError ? 'is-invalid' : userEmail.trim() && !emailError ? 'is-valid' : ''}`}
              id="userEmail"
              placeholder="이메일을 입력해주세요."
              value={userEmail}
              onChange={handleEmailChange}
              maxLength={100}
              required
              spellCheck="false"
            />
            {emailError && <div className="invalid-feedback">{emailError}</div>}
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
              허용 파일: JPG, JPEG, PNG, GIF, WEBP | 최대 크기:{' '}
              {formatFileSize(getUploadPolicy('profileImage')?.maxSize || 0)}
            </small>
            {profileImageError && (
              <div className="invalid-feedback d-block">
                {profileImageError}
              </div>
            )}
            {profileImageValidation?.isValid && (
              <div className="valid-feedback d-block">
                ✓ 유효한 이미지 파일입니다 (
                {formatFileSize(profileImageFile?.size || 0)})
              </div>
            )}
          </div>
        </div>

        {/* 이미지 미리보기 */}
        {profileImage &&
          (!profileImageFile || profileImageValidation?.isValid) && (
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
                      borderRadius: '8px',
                    }}
                  />
                  <div className="ms-3">
                    <div className="text-success">
                      <small>
                        {profileImageFile ? (
                          <>
                            <strong>{profileImageFile.name}</strong>
                            <br />
                            크기: {formatFileSize(profileImageFile.size)}
                            <br />
                            상태: 검증 완료 ✓
                          </>
                        ) : (
                          <>
                            <strong>현재 프로필 이미지</strong>
                            <br />
                            <span className="text-muted">
                              서버에 저장된 이미지입니다.
                            </span>
                          </>
                        )}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* 파일 업로드 진행 상황 */}
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

        {/* AI API Key 필드 */}
        <div className="form-group row mb-3">
          <label htmlFor="aiApiKey" className="col-3 col-form-label">
            AI API Key
          </label>
          <div className="col-9">
            <input
              type="password"
              className="form-control"
              id="aiApiKey"
              placeholder="Gemini API Key를 입력하세요 (변경 시에만 입력)"
              value={aiApiKey}
              onChange={(e) => setAiApiKey(e.target.value)}
              autoComplete="off"
            />
            <small className="form-text text-muted">
              <a
                href="https://aistudio.google.com/app/api-keys"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google AI Studio
              </a>
              에서 발급받은 API Key를 입력해주세요. 입력하지 않으면 기존 키가
              유지됩니다.
            </small>
          </div>
        </div>

        {/* 설명 필드 */}
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
              value={userDescription}
              onChange={handleDescriptionChange}
              maxLength={4000}
              style={{ resize: 'none' }}
              spellCheck="false"
            />
            <small className="form-text text-muted">
              {userDescription.length}/4000 자
            </small>
          </div>
        </div>

        {/* 폼 액션 */}
        <div className="row">
          <div className="col-3">
            <button
              type="button"
              className="btn btn-secondary w-100"
              onClick={handleCancel}
              disabled={
                isSubmitting ||
                uploadStatus === 'uploading' ||
                uploadStatus === 'validating'
              }
            >
              취소
            </button>
          </div>
          <div className="col-9">
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={
                isSubmitting ||
                uploadStatus === 'uploading' ||
                uploadStatus === 'validating' ||
                nameError ||
                emailError ||
                profileImageError
              }
            >
              {isSubmitting ||
              uploadStatus === 'uploading' ||
              uploadStatus === 'validating' ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  {uploadStatus === 'uploading'
                    ? '이미지 업로드 중...'
                    : uploadStatus === 'validating'
                      ? '파일 검증 중...'
                      : '저장 중...'}
                </>
              ) : (
                '저장'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ProfileUpdateForm;
