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

/**
 * 비밀번호를 SHA-256으로 해싱합니다. (레인보우 테이블 공격 방지를 위해 userId를 솔트로 사용)
 * @param password 평문 비밀번호
 * @param salt 솔트 (주로 userId)
 * @returns 해싱된 64자리 16진수 문자열
 */
export const hashPassword = async (
  password: string,
  salt: string,
): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
};
