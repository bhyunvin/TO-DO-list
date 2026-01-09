/**
 * ISO 날짜 문자열을 'YYYY-MM-DD HH:mm' 형식으로 변환합니다.
 * @param {string} isoString - 변환할 ISO 날짜 문자열.
 * @returns {string} 변환된 날짜 문자열, isoString이 거짓 같은 값(falsy)이면 빈 문자열 반환.
 */
export const formatDateTime = (isoString) => {
  if (!isoString) {
    return '';
  }
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};
