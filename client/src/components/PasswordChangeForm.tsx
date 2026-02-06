import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { BsEye } from '@react-icons/all-files/bs/BsEye';
import { BsEyeSlash } from '@react-icons/all-files/bs/BsEyeSlash';

import { useAuthStore } from '../authStore/authStore';
import { showConfirmAlert } from '../utils/alertUtils';

import { getPasswordStrength } from '../utils/passwordUtils';

const getInputClass = (error, value) => {
  if (error) return 'form-control is-invalid';
  if (value?.trim()) return 'form-control is-valid';
  return 'form-control';
};

/**
 * PasswordChangeForm 컴포넌트
 * 사용자가 비밀번호를 변경할 수 있도록 합니다
 */
const PasswordChangeForm = ({
  onSave,
  onCancel,
  isSubmitting = false,
  onDirtyChange,
}) => {
  const { user } = useAuthStore();
  // 폼 상태
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localSubmitting, setLocalSubmitting] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // 유효성 검사 오류 상태
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // 비밀번호 표시 상태
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 변경 감지 및 부모 컴포넌트에 알림
  useEffect(() => {
    if (onDirtyChange) {
      const hasChanges =
        currentPassword !== '' || newPassword !== '' || confirmPassword !== '';
      onDirtyChange(hasChanges);
    }
  }, [currentPassword, newPassword, confirmPassword, onDirtyChange]);

  /**
   * 유효성 검사와 함께 현재 비밀번호 입력 변경 처리
   */
  const handleCurrentPasswordChange = (e) => {
    const passwordValue = e.target.value;
    setCurrentPassword(passwordValue);

    // 실시간 유효성 검사
    if (passwordValue.trim()) {
      setCurrentPasswordError('');
    } else {
      setCurrentPasswordError('현재 비밀번호를 입력해주세요.');
    }
  };

  /**
   * 유효성 검사와 함께 새 비밀번호 입력 변경 처리
   */
  const handleNewPasswordChange = (e) => {
    const passwordValue = e.target.value;
    setNewPassword(passwordValue);

    // 실시간 유효성 검사
    if (passwordValue.trim()) {
      if (passwordValue.length < 8) {
        setNewPasswordError('새 비밀번호는 최소 8자 이상이어야 합니다.');
      } else if (passwordValue.length > 100) {
        setNewPasswordError('새 비밀번호는 최대 100자까지 입력 가능합니다.');
      } else if (!/[@$!%*?&]/.test(passwordValue)) {
        setNewPasswordError(
          '새 비밀번호는 특수문자(@$!%*?&)를 하나 이상 포함해야 합니다.',
        );
      } else if (passwordValue === currentPassword) {
        setNewPasswordError('새 비밀번호는 현재 비밀번호와 달라야 합니다.');
      } else {
        setNewPasswordError('');
      }
    } else {
      setNewPasswordError('새 비밀번호를 입력해주세요.');
    }

    // 이미 입력된 경우 비밀번호 확인 재검증
    if (confirmPassword) {
      if (passwordValue === confirmPassword) {
        setConfirmPasswordError('');
      } else {
        setConfirmPasswordError(
          '새 비밀번호와 비밀번호 확인이 일치하지 않습니다.',
        );
      }
    }
  };

  /**
   * 유효성 검사와 함께 비밀번호 확인 입력 변경 처리
   */
  const handleConfirmPasswordChange = (e) => {
    const passwordValue = e.target.value;
    setConfirmPassword(passwordValue);

    // 실시간 유효성 검사
    if (passwordValue.trim()) {
      if (passwordValue === newPassword) {
        setConfirmPasswordError('');
      } else {
        setConfirmPasswordError(
          '새 비밀번호와 비밀번호 확인이 일치하지 않습니다.',
        );
      }
    } else {
      setConfirmPasswordError('새 비밀번호 확인을 입력해주세요.');
    }
  };

  /**
   * 제출 전 전체 폼 유효성 검사
   */
  const validateForm = () => {
    let isValid = true;

    if (currentPassword.trim()) {
      setCurrentPasswordError('');
    } else {
      setCurrentPasswordError('현재 비밀번호를 입력해주세요.');
      isValid = false;
    }

    if (!newPassword.trim()) {
      setNewPasswordError('새 비밀번호를 입력해주세요.');
      isValid = false;
    } else if (newPassword.length < 8) {
      setNewPasswordError('새 비밀번호는 최소 8자 이상이어야 합니다.');
      isValid = false;
    } else if (newPassword.length > 100) {
      setNewPasswordError('새 비밀번호는 최대 100자까지 입력 가능합니다.');
      isValid = false;
    } else if (!/[@$!%*?&]/.test(newPassword)) {
      setNewPasswordError(
        '새 비밀번호는 특수문자(@$!%*?&)를 하나 이상 포함해야 합니다.',
      );
      isValid = false;
    } else if (newPassword === currentPassword) {
      setNewPasswordError('새 비밀번호는 현재 비밀번호와 달라야 합니다.');
      isValid = false;
    } else {
      setNewPasswordError('');
    }

    if (!confirmPassword.trim()) {
      setConfirmPasswordError('새 비밀번호 확인을 입력해주세요.');
      isValid = false;
    } else if (confirmPassword === newPassword) {
      setConfirmPasswordError('');
    } else {
      setConfirmPasswordError(
        '새 비밀번호와 비밀번호 확인이 일치하지 않습니다.',
      );
      isValid = false;
    }

    return isValid;
  };

  /**
   * 폼 제출 처리
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const passwordData = {
      currentPassword: currentPassword.trim(),
      newPassword: newPassword.trim(),
      confirmPassword: confirmPassword.trim(),
    };

    try {
      setLocalSubmitting(true);
      await onSave(passwordData);
    } catch (error) {
      console.error('Password change error:', error);
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
    const hasChanges = currentPassword || newPassword || confirmPassword;

    if (hasChanges) {
      showConfirmAlert({
        title: '정말 취소하시겠습니까?',
        text: '입력한 내용이 저장되지 않습니다.',
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
  };

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <div className="password-change-form">
      <h2>비밀번호 변경</h2>

      <form onSubmit={handleSubmit}>
        {/* 브라우저 접근성 경고 해결을 위한 숨겨진 Username 필드 */}
        <input
          type="text"
          name="username"
          autoComplete="username"
          value={user?.userId || ''}
          readOnly
          style={{ display: 'none' }}
        />

        <div className="form-group row mb-3">
          <label htmlFor="currentPassword" className="col-3 col-form-label">
            현재 비밀번호 <span className="text-danger">*</span>
          </label>
          <div className="col-9">
            <div className="input-group">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                className={getInputClass(currentPasswordError, currentPassword)}
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
                {showCurrentPassword ? <BsEyeSlash /> : <BsEye />}
              </button>
            </div>
            {currentPasswordError && (
              <div className="invalid-feedback d-block">
                {currentPasswordError}
              </div>
            )}
          </div>
        </div>

        <div className="form-group row mb-3">
          <label htmlFor="newPassword" className="col-3 col-form-label">
            새 비밀번호 <span className="text-danger">*</span>
          </label>
          <div className="col-9">
            <div className="input-group">
              <input
                type={showNewPassword ? 'text' : 'password'}
                className={getInputClass(newPasswordError, newPassword)}
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
                {showNewPassword ? <BsEyeSlash /> : <BsEye />}
              </button>
            </div>
            {newPasswordError && (
              <div className="invalid-feedback d-block">{newPasswordError}</div>
            )}
            {newPassword && !newPasswordError && (
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

        <div className="form-group row mb-3">
          <label htmlFor="confirmPassword" className="col-3 col-form-label">
            새 비밀번호 확인 <span className="text-danger">*</span>
          </label>
          <div className="col-9">
            <div className="input-group">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className={getInputClass(confirmPasswordError, confirmPassword)}
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
                {showConfirmPassword ? <BsEyeSlash /> : <BsEye />}
              </button>
            </div>
            {confirmPasswordError && (
              <div className="invalid-feedback d-block">
                {confirmPasswordError}
              </div>
            )}
            {confirmPassword &&
              !confirmPasswordError &&
              newPassword === confirmPassword && (
                <div className="valid-feedback d-block">
                  ✓ 비밀번호가 일치합니다.
                </div>
              )}
          </div>
        </div>

        <div className="alert alert-info mb-3">
          <h6 className="alert-heading">🔒 보안 안내</h6>
          <ul className="mb-0">
            <li>비밀번호는 정기적으로 변경하는 것이 좋습니다.</li>
            <li>다른 사이트와 동일한 비밀번호 사용을 피해주세요.</li>
            <li>
              비밀번호 변경 후 모든 기기에서 다시 로그인해야 할 수 있습니다.
            </li>
          </ul>
        </div>

        <div className="row">
          <div className="col-3">
            <button
              type="button"
              className="btn btn-outline-secondary w-100"
              onClick={handleCancel}
              disabled={isSubmitting || localSubmitting}
            >
              취소
            </button>
          </div>
          <div className="col-9">
            <button
              type="submit"
              className="btn btn-outline-primary w-100"
              disabled={
                !!(
                  isSubmitting ||
                  localSubmitting ||
                  currentPasswordError ||
                  newPasswordError ||
                  confirmPasswordError ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                )
              }
            >
              {isSubmitting || localSubmitting ? (
                <>
                  <output
                    className="spinner-border spinner-border-sm me-2"
                    aria-label="Loading..."
                  >
                    <span className="visually-hidden">Loading...</span>
                  </output>
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
};

PasswordChangeForm.propTypes = {
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
  onDirtyChange: PropTypes.func,
};

export default PasswordChangeForm;
