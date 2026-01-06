/**
 * SweetAlert2를 동적으로 로드합니다.
 * CSS도 함께 로드하여 스타일이 적용되도록 합니다.
 * @returns {Promise<typeof import('sweetalert2').default>}
 */
export const loadSwal = async () => {
  await import('sweetalert2/dist/sweetalert2.min.css');
  const { default: Swal } = await import('sweetalert2/dist/sweetalert2.min.js');
  return Swal;
};

/**
 * 범용 알림을 표시합니다.
 * @param {import('sweetalert2').SweetAlertOptions} options SweetAlert2 옵션
 * @returns {Promise<import('sweetalert2').SweetAlertResult>}
 */
export const showAlert = async (options) => {
  const Swal = await loadSwal();
  return Swal.fire(options);
};

/**
 * 성공 알림을 표시합니다.
 * @param {string} title 제목
 * @param {string} [text] 내용
 * @returns {Promise<import('sweetalert2').SweetAlertResult>}
 */
export const showSuccessAlert = async (title, text) => {
  const Swal = await loadSwal();
  return Swal.fire(title, text || '', 'success');
};

/**
 * 에러 알림을 표시합니다.
 * @param {string} title 제목
 * @param {string} [text] 내용
 * @returns {Promise<import('sweetalert2').SweetAlertResult>}
 */
export const showErrorAlert = async (title, text) => {
  const Swal = await loadSwal();
  return Swal.fire(title, text || '', 'error');
};

/**
 * 경고 알림을 표시합니다.
 * @param {string} title 제목
 * @param {string} [text] 내용
 * @returns {Promise<import('sweetalert2').SweetAlertResult>}
 */
export const showWarningAlert = async (title, text) => {
  const Swal = await loadSwal();
  return Swal.fire(title, text || '', 'warning');
};

/**
 * 토스트 알림을 표시합니다.
 * @param {Object} options 옵션
 * @param {string} options.title 제목
 * @param {'success'|'error'|'warning'|'info'} [options.icon='success'] 아이콘
 * @param {number} [options.timer=3000] 표시 시간 (ms)
 * @returns {Promise<import('sweetalert2').SweetAlertResult>}
 */
export const showToast = async ({ title, icon = 'success', timer = 3000 }) => {
  const Swal = await loadSwal();
  return Swal.fire({
    toast: true,
    position: 'top-end',
    icon,
    title,
    showConfirmButton: false,
    timer,
    timerProgressBar: true,
  });
};

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
export const showConfirmAlert = async ({
  title,
  text,
  confirmButtonText = '확인',
  cancelButtonText = '취소',
}) => {
  const Swal = await loadSwal();
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
