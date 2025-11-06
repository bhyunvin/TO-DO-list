import React, { useState } from 'react';
import Swal from 'sweetalert2';

/**
 * PasswordChangeForm Component
 * Allows users to change their password
 */
function PasswordChangeForm({ onSave, onCancel, isSubmitting = false }) {
  // Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Validation error states
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /**
   * Handle current password input change with validation
   */
  function handleCurrentPasswordChange(e) {
    const passwordValue = e.target.value;
    setCurrentPassword(passwordValue);
    
    // Real-time validation
    if (!passwordValue.trim()) {
      setCurrentPasswordError('현재 비밀번호를 입력해주세요.');
    } else {
      setCurrentPasswordError('');
    }
  }

  /**
   * Handle new password input change with validation
   */
  function handleNewPasswordChange(e) {
    const passwordValue = e.target.value;
    setNewPassword(passwordValue);
    
    // Real-time validation
    if (!passwordValue.trim()) {
      setNewPasswordError('새 비밀번호를 입력해주세요.');
    } else if (passwordValue.length < 8) {
      setNewPasswordError('새 비밀번호는 최소 8자 이상이어야 합니다.');
    } else if (passwordValue.length > 100) {
      setNewPasswordError('새 비밀번호는 최대 100자까지 입력 가능합니다.');
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(passwordValue)) {
      setNewPasswordError('새 비밀번호는 대문자, 소문자, 숫자, 특수문자(@$!%*?&)를 각각 하나 이상 포함해야 합니다.');
    } else if (passwordValue === currentPassword) {
      setNewPasswordError('새 비밀번호는 현재 비밀번호와 달라야 합니다.');
    } else {
      setNewPasswordError('');
    }

    // Re-validate confirm password if it's already entered
    if (confirmPassword) {
      if (passwordValue !== confirmPassword) {
        setConfirmPasswordError('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      } else {
        setConfirmPasswordError('');
      }
    }
  }

  /**
   * Handle confirm password input change with validation
   */
  function handleConfirmPasswordChange(e) {
    const passwordValue = e.target.value;
    setConfirmPassword(passwordValue);
    
    // Real-time validation
    if (!passwordValue.trim()) {
      setConfirmPasswordError('새 비밀번호 확인을 입력해주세요.');
    } else if (passwordValue !== newPassword) {
      setConfirmPasswordError('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
    } else {
      setConfirmPasswordError('');
    }
  }

  /**
   * Validate the entire form before submission
   */
  function validateForm() {
    let isValid = true;

    // Validate current password
    if (!currentPassword.trim()) {
      setCurrentPasswordError('현재 비밀번호를 입력해주세요.');
      isValid = false;
    } else {
      setCurrentPasswordError('');
    }

    // Validate new password
    if (!newPassword.trim()) {
      setNewPasswordError('새 비밀번호를 입력해주세요.');
      isValid = false;
    } else if (newPassword.length < 8) {
      setNewPasswordError('새 비밀번호는 최소 8자 이상이어야 합니다.');
      isValid = false;
    } else if (newPassword.length > 100) {
      setNewPasswordError('새 비밀번호는 최대 100자까지 입력 가능합니다.');
      isValid = false;
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(newPassword)) {
      setNewPasswordError('새 비밀번호는 대문자, 소문자, 숫자, 특수문자(@$!%*?&)를 각각 하나 이상 포함해야 합니다.');
      isValid = false;
    } else if (newPassword === currentPassword) {
      setNewPasswordError('새 비밀번호는 현재 비밀번호와 달라야 합니다.');
      isValid = false;
    } else {
      setNewPasswordError('');
    }

    // Validate confirm password
    if (!confirmPassword.trim()) {
      setConfirmPasswordError('새 비밀번호 확인을 입력해주세요.');
      isValid = false;
    } else if (confirmPassword !== newPassword) {
      setConfirmPasswordError('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      isValid = false;
    } else {
      setConfirmPasswordError('');
    }

    return isValid;
  }

  /**
   * Handle form submission
   */
  async function handleSubmit(e) {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Prepare password data
    const passwordData = {
      currentPassword: currentPassword.trim(),
      newPassword: newPassword.trim(),
      confirmPassword: confirmPassword.trim()
    };

    try {
      await onSave(passwordData);
    } catch (error) {
      console.error('Password change error:', error);
      // Error handling is done in the parent component
    }
  }

  /**
   * Handle cancel action with confirmation
   */
  function handleCancel() {
    // Check if form has been modified
    const hasChanges = currentPassword || newPassword || confirmPassword;

    if (hasChanges) {
      Swal.fire({
        title: '정말 취소하시겠습니까?',
        text: '입력한 내용이 저장되지 않습니다.',
        icon: 'warning',
        showCancelButton: true,
        reverseButtons: true,
        confirmButtonColor: '#0d6efd',
        cancelButtonColor: '#6C757D',
        confirmButtonText: '확인',
        cancelButtonText: '계속 수정',
      }).then((result) => {
        if (result.isConfirmed) {
          onCancel();
        }
      });
    } else {
      onCancel();
    }
  }

  /**
   * Get password strength indicator
   */
  function getPasswordStrength(password) {
    if (!password) return { strength: 0, text: '', color: '' };
    
    let strength = 0;
    const checks = [
      /[a-z]/.test(password), // lowercase
      /[A-Z]/.test(password), // uppercase
      /\d/.test(password),    // numbers
      /[@$!%*?&]/.test(password), // special chars
      password.length >= 8,   // length
      password.length >= 12   // good length
    ];
    
    strength = checks.filter(Boolean).length;
    
    if (strength <= 2) return { strength, text: '약함', color: 'danger' };
    if (strength <= 4) return { strength, text: '보통', color: 'warning' };
    return { strength, text: '강함', color: 'success' };
  }

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <div className="password-change-form">
      <h2>비밀번호 변경</h2>
      <form onSubmit={handleSubmit}>
        {/* Current Password Field */}
        <div className="form-group row mb-3">
          <label htmlFor="currentPassword" className="col-3 col-form-label">
            현재 비밀번호 <span className="text-danger">*</span>
          </label>
          <div className="col-9">
            <div className="input-group">
              <input
                type={showCurrentPassword ? "text" : "password"}
                className={`form-control ${currentPasswordError ? 'is-invalid' : currentPassword.trim() ? 'is-valid' : ''}`}
                id="currentPassword"
                placeholder="현재 비밀번호를 입력해주세요."
                value={currentPassword}
                onChange={handleCurrentPasswordChange}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {currentPasswordError && <div className="invalid-feedback d-block">{currentPasswordError}</div>}
          </div>
        </div>

        {/* New Password Field */}
        <div className="form-group row mb-3">
          <label htmlFor="newPassword" className="col-3 col-form-label">
            새 비밀번호 <span className="text-danger">*</span>
          </label>
          <div className="col-9">
            <div className="input-group">
              <input
                type={showNewPassword ? "text" : "password"}
                className={`form-control ${newPasswordError ? 'is-invalid' : newPassword.trim() && !newPasswordError ? 'is-valid' : ''}`}
                id="newPassword"
                placeholder="새 비밀번호를 입력해주세요."
                value={newPassword}
                onChange={handleNewPasswordChange}
                maxLength={100}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {newPasswordError && <div className="invalid-feedback d-block">{newPasswordError}</div>}
            {newPassword && !newPasswordError && (
              <div className={`text-${passwordStrength.color} mt-1`}>
                <small>
                  비밀번호 강도: <strong>{passwordStrength.text}</strong>
                  <div className="progress mt-1" style={{ height: '4px' }}>
                    <div 
                      className={`progress-bar bg-${passwordStrength.color}`}
                      style={{ width: `${(passwordStrength.strength / 6) * 100}%` }}
                    ></div>
                  </div>
                </small>
              </div>
            )}
            <small className="form-text text-muted">
              8자 이상, 대문자, 소문자, 숫자, 특수문자(@$!%*?&) 각각 하나 이상 포함
            </small>
          </div>
        </div>

        {/* Confirm Password Field */}
        <div className="form-group row mb-3">
          <label htmlFor="confirmPassword" className="col-3 col-form-label">
            새 비밀번호 확인 <span className="text-danger">*</span>
          </label>
          <div className="col-9">
            <div className="input-group">
              <input
                type={showConfirmPassword ? "text" : "password"}
                className={`form-control ${confirmPasswordError ? 'is-invalid' : confirmPassword.trim() && !confirmPasswordError ? 'is-valid' : ''}`}
                id="confirmPassword"
                placeholder="새 비밀번호를 다시 입력해주세요."
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                maxLength={100}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {confirmPasswordError && <div className="invalid-feedback d-block">{confirmPasswordError}</div>}
            {confirmPassword && !confirmPasswordError && newPassword === confirmPassword && (
              <div className="valid-feedback d-block">
                ✓ 비밀번호가 일치합니다.
              </div>
            )}
          </div>
        </div>

        {/* Security Notice */}
        <div className="alert alert-info mb-3">
          <h6 className="alert-heading">🔒 보안 안내</h6>
          <ul className="mb-0">
            <li>비밀번호는 정기적으로 변경하는 것이 좋습니다.</li>
            <li>다른 사이트와 동일한 비밀번호 사용을 피해주세요.</li>
            <li>비밀번호 변경 후 모든 기기에서 다시 로그인해야 할 수 있습니다.</li>
          </ul>
        </div>

        {/* Form Actions */}
        <div className="row">
          <div className="col-3">
            <button 
              type="button" 
              className="btn btn-secondary w-100" 
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              취소
            </button>
          </div>
          <div className="col-9">
            <button 
              type="submit" 
              className="btn btn-primary w-100"
              disabled={isSubmitting || currentPasswordError || newPasswordError || confirmPasswordError || !currentPassword || !newPassword || !confirmPassword}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  비밀번호 변경 중...
                </>
              ) : (
                '비밀번호 변경'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default PasswordChangeForm;