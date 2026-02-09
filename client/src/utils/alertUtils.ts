import { useThemeStore } from '../stores/themeStore';

/**
 * SweetAlert2를 동적으로 로드합니다.
 * @returns {Promise<typeof import('sweetalert2')>}
 */
export const loadSwal = async () => {
  // 패키지 명만 사용하여 Vite가 최적의 모듈을 가져오게 함
  const module = await import('sweetalert2');
  const Swal = (module.default ||
    module) as typeof import('sweetalert2').default;

  const { theme } = useThemeStore.getState();

  if (theme === 'dark') {
    return Swal.mixin({
      background: '#2b3035', // Bootstrap 다크 모달 배경색
      color: '#dee2e6', // Bootstrap 다크 텍스트 색상
    });
  }

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
export const showSuccessAlert = async (title, text?) => {
  const Swal = await loadSwal();
  return Swal.fire(title, text || '', 'success');
};

/**
 * 에러 알림을 표시합니다.
 * @param {string} title 제목
 * @param {string} [text] 내용
 * @returns {Promise<import('sweetalert2').SweetAlertResult>}
 */
export const showErrorAlert = async (title, text?) => {
  const Swal = await loadSwal();
  return Swal.fire(title, text || '', 'error');
};

/**
 * 경고 알림을 표시합니다.
 * @param {string} title 제목
 * @param {string} [text] 내용
 * @returns {Promise<import('sweetalert2').SweetAlertResult>}
 */
export const showWarningAlert = async (title, text?) => {
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
  // 모바일 환경(768px 미만)에서는 하단 중앙, 그 외에는 상단 우측
  const position = window.innerWidth < 768 ? 'bottom' : 'top-end';

  return Swal.fire({
    toast: true,
    position,
    icon: icon as import('sweetalert2').SweetAlertIcon,
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
  customClass = {},
  ...otherOptions
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
      ...customClass,
    },
    buttonsStyling: false,
    reverseButtons: true,
    ...otherOptions,
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

/**
 * 엑셀 내보내기를 위한 날짜 범위 선택 모달을 표시합니다.
 * @returns {Promise<import('sweetalert2').SweetAlertResult>}
 */
export const showDateRangePrompt = async () => {
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const Swal = await loadSwal();
  return Swal.fire({
    title: 'Excel 내보내기',
    html: `
      <div style="display: flex; flex-direction: column; gap: 15px; text-align: left;">
        <div>
          <label for="startDate" style="display: block; margin-bottom: 5px; font-weight: 500;">시작일</label>
          <input 
            type="date" 
            id="startDate" 
            class="swal2-input" 
            value="${formatDate(firstDay)}"
            style="width: 100%; margin: 0; padding: 10px;"
          />
        </div>
        <div>
          <label for="endDate" style="display: block; margin-bottom: 5px; font-weight: 500;">종료일</label>
          <input 
            type="date" 
            id="endDate" 
            class="swal2-input" 
            value="${formatDate(lastDay)}"
            style="width: 100%; margin: 0; padding: 10px;"
          />
        </div>
      </div>
    `,
    showCancelButton: true,
    reverseButtons: true,
    confirmButtonText: '확인',
    cancelButtonText: '취소',
    confirmButtonColor: 'transparent',
    cancelButtonColor: 'transparent',
    customClass: {
      confirmButton: 'btn btn-outline-primary',
      cancelButton: 'btn btn-outline-secondary me-2',
    },
    buttonsStyling: false,
    focusConfirm: false,
    preConfirm: () => {
      const startDate = (
        document.getElementById('startDate') as HTMLInputElement
      ).value;
      const endDate = (document.getElementById('endDate') as HTMLInputElement)
        .value;

      if (!startDate || !endDate) {
        Swal.showValidationMessage('날짜를 선택해주세요');
        return false;
      }

      if (startDate > endDate) {
        Swal.showValidationMessage('시작일은 종료일보다 이전이어야 합니다');
        return false;
      }

      return { startDate, endDate };
    },
  });
};
