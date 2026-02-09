import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../api/client';
import PropTypes from 'prop-types';
import 'sweetalert2/dist/sweetalert2.min.css';
import { useFileUploadValidator } from '../hooks/useFileUploadValidator';
import { useFileUploadProgress } from '../hooks/useFileUploadProgress';
import FileUploadProgress from './FileUploadProgress';
import userService from '../api/userService';
import { showConfirmAlert, showErrorAlert } from '../utils/alertUtils';
import useSecureImage from '../hooks/useSecureImage';

const isValidEmail = (email) => {
  // 영문 대소문자, 숫자, 특수문자(._%+-), 서브도메인, 2자리 이상의 최상위 도메인 허용
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
};

const getInputClass = (error, value) => {
  if (error) return 'form-control is-invalid';
  if (value?.trim()) return 'form-control is-valid';
  return 'form-control';
};

const checkChanges = (originalUser, user, currentValues) => {
  const comparisonUser = originalUser || user;
  const { userName, userEmail, userDescription, aiApiKey, profileImageFile } =
    currentValues;

  return (
    userName !== (comparisonUser?.userName || '') ||
    userEmail !== (comparisonUser?.userEmail || '') ||
    userDescription !== (comparisonUser?.userDescription || '') ||
    (aiApiKey !== '' && aiApiKey.trim().length > 0) ||
    profileImageFile !== null
  );
};

/**
 * ProfileUpdateForm 컴포넌트
 * 사용자가 이름, 이메일, 설명 및 프로필 이미지를 포함한 프로필 정보를 업데이트할 수 있도록 합니다
 */
const ProfileUpdateForm = ({
  user,
  onSave,
  onCancel,
  isSubmitting = false,
  onDirtyChange,
}) => {
  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

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
  const [isLoadingDetail, setIsLoadingDetail] = useState(true);
  const [localSubmitting, setLocalSubmitting] = useState(false);

  // 변경 감지를 위한 원본 데이터 (복호화된 상태)
  const [originalUser, setOriginalUser] = useState(null);

  // user prop이 변경될 때 폼을 사용자 데이터로 초기화
  useEffect(() => {
    // 상세 정보를 서버에서 다시 가져와야 함 (이메일 등이 마스킹되어 있을 수 있음)
    const fetchProfileDetail = async () => {
      setIsLoadingDetail(true);
      try {
        // 이미 가지고 있는 정보로 먼저 초기화 (빠른 UI 표시)
        if (user) {
          setUserName(user.userName || '');
          // 이메일이 암호화된 상태(Ciphertext)라면 초기값으로 표시하지 않음
          // 평문 이메일에는 '@'가 포함되어 있어야 함
          if (user.userEmail?.includes('@')) {
            setUserEmail(user.userEmail || '');
          }
          setUserDescription(user.userDescription || '');
          if (user.profileImage) {
            setProfileImage(user.profileImage);
          }
        }

        const detailUser = await userService.getUserProfileDetail();
        if (detailUser) {
          setUserName(detailUser.userName || '');
          // 이메일이 평문인지 확인 (@ 포함 여부)
          if (detailUser.userEmail?.includes('@')) {
            setUserEmail(detailUser.userEmail);
          }
          setUserDescription(detailUser.userDescription || '');

          if (detailUser.profileImage) {
            setProfileImage(detailUser.profileImage);
          }

          // 변경 감지를 위해 원본 데이터 저장
          setOriginalUser(detailUser);
        }
      } catch (error) {
        console.error('Failed to fetch profile detail:', error);
        // 실패 시 props로 받은 user 정보 사용 (이미 위에서 세팅됨)
        // 단, 마스킹된 이메일이 들어갈 수 있음 -> 사용자 수정 시 불편할 수 있음.
        if (user?.userEmail?.includes('@')) {
          setUserEmail(user.userEmail);
        }
        showErrorAlert('오류', '프로필 정보를 불러오는데 실패했습니다.');
      } finally {
        setIsLoadingDetail(false);
      }
    };

    fetchProfileDetail();
  }, [user]);

  // 변경 감지 및 부모 컴포넌트에 알림
  useEffect(() => {
    if (onDirtyChange) {
      const currentValues = {
        userName,
        userEmail,
        userDescription,
        aiApiKey,
        profileImageFile,
      };
      // originalUser가 없으면(로딩 중) 변경 없음으로 처리
      const hasChanges = originalUser
        ? checkChanges(originalUser, user, currentValues)
        : false;
      onDirtyChange(hasChanges);
    }
  }, [
    userName,
    userEmail,
    userDescription,
    aiApiKey,
    profileImageFile,
    originalUser,
    user,
    onDirtyChange,
  ]);

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
    let nameValue = e.target.value;
    // maxLength에 대한 방어적 확인
    if (nameValue.length > 200) {
      nameValue = nameValue.slice(0, 200);
    }
    setUserName(nameValue);

    // 실시간 유효성 검사
    if (nameValue.trim()) {
      setNameError('');
    } else {
      setNameError('이름을 입력해주세요.');
    }
  };

  /**
   * 유효성 검사와 함께 이메일 입력 변경 처리
   */
  const handleEmailChange = (e) => {
    let emailValue = e.target.value;
    // maxLength에 대한 방어적 확인
    if (emailValue.length > 100) {
      emailValue = emailValue.slice(0, 100);
    }
    setUserEmail(emailValue);

    // 실시간 유효성 검사
    if (emailValue.trim()) {
      if (isValidEmail(emailValue.trim())) {
        setEmailError('');
      } else {
        setEmailError('올바른 이메일 형식을 입력해주세요.');
      }
    } else {
      setEmailError('이메일을 입력해주세요.');
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
    if (userName.trim()) {
      if (userName.length > 200) {
        setNameError('이름은 200자 이내로 입력해주세요.');
        isValid = false;
      } else {
        setNameError('');
      }
    } else {
      setNameError('이름을 입력해주세요.');
      isValid = false;
    }

    // 이메일 유효성 검사
    if (userEmail.trim()) {
      if (userEmail.length > 100) {
        setEmailError('이메일은 100자 이내로 입력해주세요.');
        isValid = false;
      } else if (isValidEmail(userEmail.trim())) {
        setEmailError('');
      } else {
        setEmailError('올바른 이메일 형식을 입력해주세요.');
        isValid = false;
      }
    } else {
      setEmailError('이메일을 입력해주세요.');
      isValid = false;
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
      setLocalSubmitting(true);
      await onSave(profileData);
    } catch (error) {
      console.error('Profile update error:', error);
      // 오류 처리는 부모 컴포넌트에서 수행됨
    } finally {
      if (isMounted.current) {
        setLocalSubmitting(false);
      }
    }
  };

  /**
   * 확인과 함께 취소 동작 처리
   */
  const handleCancel = () => {
    // 폼이 수정되었는지 확인
    const currentValues = {
      userName,
      userEmail,
      userDescription,
      aiApiKey,
      profileImageFile,
    };

    const hasChanges = checkChanges(originalUser, user, currentValues);

    if (hasChanges) {
      showConfirmAlert({
        title: '정말 취소하시겠습니까?',
        text: '변경사항이 저장되지 않습니다.',
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

  // useSecureImage 훅은 컴포넌트 최상위 레벨에서 호출되어야 함
  // profileImage가 /api로 시작하는 경우에만 작동하고, data:나 http는 그대로 반환됨
  const secureProfileImage = useSecureImage(profileImage);

  const renderImagePreview = () => {
    if (!profileImage || (profileImageFile && !profileImageValidation?.isValid))
      return null;

    // secureProfileImage가 로딩 중이거나 변환된 URL일 수 있음
    const displayImage = secureProfileImage || profileImage;

    return (
      <div className="form-group row mb-3">
        <div className="col-3 col-form-label">미리보기</div>
        <div className="col-9">
          <div className="d-flex align-items-center">
            <img
              src={
                displayImage?.startsWith('data:') ||
                displayImage?.startsWith('http') ||
                displayImage?.startsWith('blob:')
                  ? displayImage
                  : `${API_URL}${displayImage?.replace(/^\/api/, '')}`
              }
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
    );
  };

  const renderUploadStatus = () => {
    if (!profileImageFile || (uploadStatus === 'idle' && !isSubmitting))
      return null;

    return (
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
                const validationResults = validateFiles([file], 'profileImage');
                setProfileImageValidation(validationResults[0]);
              }
            }}
          />
        </div>
      </div>
    );
  };

  const getSubmitButtonText = () => {
    if (uploadStatus === 'uploading') return '이미지 업로드 중...';
    if (uploadStatus === 'validating') return '파일 검증 중...';
    if (isSubmitting) return '저장 중...';
    return '저장';
  };

  const getFileInputClass = () => {
    if (profileImageError) return 'form-control is-invalid';
    if (profileImageValidation?.isValid) return 'form-control is-valid';
    return 'form-control';
  };

  return (
    <div className="profile-update-form">
      <h2>프로필 수정</h2>
      {isLoadingDetail ? (
        <div className="text-center py-5">
          <output
            className="spinner-border text-primary"
            aria-label="Loading..."
          >
            <span className="visually-hidden">Loading...</span>
          </output>
          <p className="mt-2">정보를 불러오는 중...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group row mb-3">
            <label htmlFor="userName" className="col-3 col-form-label">
              이름 <span className="text-danger">*</span>
            </label>
            <div className="col-9">
              <input
                type="text"
                className={getInputClass(nameError, userName)}
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

          <div className="form-group row mb-3">
            <label htmlFor="userEmail" className="col-3 col-form-label">
              이메일 <span className="text-danger">*</span>
            </label>
            <div className="col-9">
              <input
                type="email"
                className={getInputClass(emailError, userEmail)}
                id="userEmail"
                placeholder="이메일을 입력해주세요."
                value={userEmail}
                onChange={handleEmailChange}
                maxLength={100}
                required
                spellCheck="false"
              />
              {emailError && (
                <div className="invalid-feedback">{emailError}</div>
              )}
            </div>
          </div>

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

          {renderImagePreview()}

          {renderUploadStatus()}

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
                </a>{' '}
                에서 발급받은 API Key를 입력해주세요. 입력하지 않으면 기존 키가
                유지됩니다.
              </small>
            </div>
          </div>

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

          <div className="row">
            <div className="col-3">
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={handleCancel}
                disabled={
                  localSubmitting ||
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
                className="btn btn-outline-primary w-100"
                disabled={
                  localSubmitting ||
                  isSubmitting ||
                  uploadStatus === 'uploading' ||
                  uploadStatus === 'validating' ||
                  !!nameError ||
                  !!emailError ||
                  !!profileImageError
                }
              >
                {localSubmitting ||
                isSubmitting ||
                uploadStatus === 'uploading' ||
                uploadStatus === 'validating' ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      aria-hidden="true"
                    ></span>
                    {getSubmitButtonText()}
                  </>
                ) : (
                  '저장'
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

ProfileUpdateForm.propTypes = {
  user: PropTypes.shape({
    userName: PropTypes.string,
    userEmail: PropTypes.string,
    userDescription: PropTypes.string,
    profileImage: PropTypes.string,
  }),
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
  onDirtyChange: PropTypes.func,
};

export default ProfileUpdateForm;
