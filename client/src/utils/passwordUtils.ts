/**
 * 비밀번호 강도 표시기 가져오기
 * @param {string} password
 * @returns {{strength: number, text: string, color: string}}
 */
export const getPasswordStrength = (password) => {
  if (!password) return { strength: 0, text: '', color: '' };

  let strength = 0;
  const checks = [
    /[a-z]/.test(password), // 소문자
    /[A-Z]/.test(password), // 대문자
    /\d/.test(password), // 숫자
    /[@$!%*?&]/.test(password), // 특수문자
    password.length >= 8, // 길이
    password.length >= 12, // 적절한 길이
  ];

  strength = checks.filter(Boolean).length;

  if (strength <= 2) return { strength, text: '약함', color: 'danger' };
  if (strength <= 4) return { strength, text: '보통', color: 'warning' };
  return { strength, text: '강함', color: 'success' };
};

/**
 * 비밀번호 유효성 검사 상수
 */
export const PASSWORD_CRITERIA = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 100,
  SPECIAL_CHAR_REGEX: /[@$!%*?&]/,
};
