import Swal from 'sweetalert2';

/**
 * 공통 확인 알림을 표시합니다 (Outline 스타일, 버튼 순서 준수).
 * @param {Object} options 알림 옵션
 * @param {string} options.title 제목
 * @param {string} options.text 내용
 * @param {string} options.confirmButtonText 확인 버튼 텍스트
 * @param {string} options.cancelButtonText 취소 버튼 텍스트
 * @param {string} options.confirmButtonColor 확인 버튼 색상 (Bootstrap class로 대체됨)
 * @returns {Promise<SweetAlertResult>} SweetAlert 결과 Promise
 */
export const showConfirmAlert = ({
  title,
  text,
  confirmButtonText = '확인',
  cancelButtonText = '취소',
}) => {
  return Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    customClass: {
      confirmButton: 'btn btn-outline-danger',
      cancelButton: 'btn btn-outline-secondary me-2',
    },
    buttonsStyling: false,
    reverseButtons: true,
  });
};

/**
 * 저장되지 않은 변경사항이 있을 때 이동 확인 알림을 표시합니다.
 * @returns {Promise<SweetAlertResult>} SweetAlert 결과 Promise
 */
export const showNavigationConfirmAlert = () => {
  return showConfirmAlert({
    title: '저장되지 않은 변경사항이 있습니다.',
    text: '정말 이동하시겠습니까? 변경사항이 저장되지 않습니다.',
    confirmButtonText: '이동',
    cancelButtonText: '취소',
  });
};
