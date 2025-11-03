import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useFileUploadValidator } from '../hooks/useFileUploadValidator';
import { useFileUploadProgress } from '../hooks/useFileUploadProgress';
import FileUploadProgress from './FileUploadProgress';

/**
 * ProfileUpdateForm Component
 * Allows users to update their profile information including name, email, description, and profile image
 */
function ProfileUpdateForm({ user, onSave, onCancel, isSubmitting = false }) {
  const { 
    validateFiles, 
    formatFileSize, 
    getUploadPolicy
  } = useFileUploadValidator();
  
  const {
    uploadStatus,
    uploadProgress,
    uploadErrors,
    resetUploadState,
  } = useFileUploadProgress();

  // Form state
  const [userName, setUserName] = useState(user?.userName || '');
  const [userEmail, setUserEmail] = useState(user?.userEmail || '');
  const [userDescription, setUserDescription] = useState(user?.userDescription || '');
  
  // Profile image state
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImageValidation, setProfileImageValidation] = useState(null);
  
  // Validation error states
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [profileImageError, setProfileImageError] = useState('');

  // Initialize form with user data when user prop changes
  useEffect(() => {
    if (user) {
      setUserName(user.userName || '');
      setUserEmail(user.userEmail || '');
      setUserDescription(user.userDescription || '');
    }
  }, [user]);

  /**
   * Handle profile image file selection and validation
   */
  function handleImageChange(e) {
    const file = e.target.files[0];
    
    // Clear previous state
    setProfileImage(null);
    setProfileImageFile(null);
    setProfileImageValidation(null);
    setProfileImageError('');
    
    if (file) {
      // Validate the file
      const validationResults = validateFiles([file], 'profileImage');
      const validation = validationResults[0];
      
      setProfileImageValidation(validation);
      
      if (validation.isValid) {
        setProfileImageFile(file);
        setProfileImageError('');
        
        // Create preview
        const reader = new FileReader();
        reader.onloadend = function () {
          setProfileImage(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setProfileImageError(validation.errorMessage);
        // Clear the file input
        e.target.value = '';
      }
    }
  }

  /**
   * Handle name input change with validation
   */
  function handleNameChange(e) {
    const nameValue = e.target.value;
    setUserName(nameValue);
    
    // Real-time validation
    if (!nameValue.trim()) {
      setNameError('이름을 입력해주세요.');
    } else if (nameValue.length > 200) {
      setNameError('이름은 200자 이내로 입력해주세요.');
    } else {
      setNameError('');
    }
  }

  /**
   * Handle email input change with validation
   */
  function handleEmailChange(e) {
    const emailValue = e.target.value;
    setUserEmail(emailValue);
    
    // Real-time validation
    if (!emailValue.trim()) {
      setEmailError('이메일을 입력해주세요.');
    } else if (emailValue.length > 100) {
      setEmailError('이메일은 100자 이내로 입력해주세요.');
    } else if (!/^[a-z0-9]+@[a-z]+\.[a-z]{2,3}$/i.test(emailValue)) {
      setEmailError('올바른 이메일 형식을 입력해주세요.');
    } else {
      setEmailError('');
    }
  }

  /**
   * Handle description input change
   */
  function handleDescriptionChange(e) {
    const descriptionValue = e.target.value;
    setUserDescription(descriptionValue);
  }

  /**
   * Validate the entire form before submission
   */
  function validateForm() {
    let isValid = true;

    // Validate name
    if (!userName.trim()) {
      setNameError('이름을 입력해주세요.');
      isValid = false;
    } else if (userName.length > 200) {
      setNameError('이름은 200자 이내로 입력해주세요.');
      isValid = false;
    } else {
      setNameError('');
    }

    // Validate email
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

    // Validate profile image if provided
    if (profileImageFile && profileImageValidation && !profileImageValidation.isValid) {
      setProfileImageError(profileImageValidation.errorMessage);
      isValid = false;
    }

    // Validate description length
    if (userDescription && userDescription.length > 4000) {
      isValid = false;
    }

    return isValid;
  }

  /**
   * Handle form submission with API integration
   */
  async function handleSubmit(e) {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Prepare form data for multipart upload
    const formData = new FormData();
    formData.append('userName', userName.trim());
    formData.append('userEmail', userEmail.trim());
    formData.append('userDescription', userDescription.trim());
    
    // Add profile image if selected
    if (profileImageFile) {
      formData.append('profileImage', profileImageFile);
    }

    // Prepare profile data object for callback
    const profileData = {
      userName: userName.trim(),
      userEmail: userEmail.trim(),
      userDescription: userDescription.trim(),
      profileImageFile,
      formData // Include FormData for API call
    };

    try {
      await onSave(profileData);
    } catch (error) {
      console.error('Profile update error:', error);
      // Error handling is done in the parent component
    }
  }

  /**
   * Handle cancel action with confirmation
   */
  function handleCancel() {
    // Check if form has been modified
    const hasChanges = 
      userName !== (user?.userName || '') ||
      userEmail !== (user?.userEmail || '') ||
      userDescription !== (user?.userDescription || '') ||
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
  }

  return (
    <div className="profile-update-form">
      <h2>프로필 수정</h2>
      <form onSubmit={handleSubmit}>
        {/* Name Field */}
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

        {/* Email Field */}
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

        {/* Profile Image Upload */}
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
              <div className="invalid-feedback d-block">
                {profileImageError}
              </div>
            )}
            {profileImageValidation?.isValid && (
              <div className="valid-feedback d-block">
                ✓ 유효한 이미지 파일입니다 ({formatFileSize(profileImageFile?.size || 0)})
              </div>
            )}
          </div>
        </div>

        {/* Image Preview */}
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

        {/* File Upload Progress */}
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
                  // For profile image, just reset the validation
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

        {/* Description Field */}
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

        {/* Form Actions */}
        <div className="row">
          <div className="col-3">
            <button 
              type="button" 
              className="btn btn-secondary w-100" 
              onClick={handleCancel}
              disabled={isSubmitting || uploadStatus === 'uploading' || uploadStatus === 'validating'}
            >
              취소
            </button>
          </div>
          <div className="col-9">
            <button 
              type="submit" 
              className="btn btn-primary w-100"
              disabled={isSubmitting || uploadStatus === 'uploading' || uploadStatus === 'validating' || nameError || emailError || profileImageError}
            >
              {isSubmitting || uploadStatus === 'uploading' || uploadStatus === 'validating' ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {uploadStatus === 'uploading' ? '이미지 업로드 중...' : 
                   uploadStatus === 'validating' ? '파일 검증 중...' : '저장 중...'}
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
}

export default ProfileUpdateForm;