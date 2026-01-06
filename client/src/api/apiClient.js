// 환경 변수에서 API URL 가져오기 (기본값 설정)
export const API_URL = import.meta.env.VITE_API_URL || '/api';
import { useAuthStore } from '../authStore/authStore';

// 헬퍼 함수: 인증 및 서버 상태 에러 처리
const handleStatusErrors = async (response, endpoint) => {
  // 401 Unauthorized 처리 (세션 만료 등)
  // 단, 로그인 요청 실패 시의 401은 세션 만료가 아니므로 제외
  if (response.status === 401 && endpoint !== '/user/login') {
    console.error('인증 실패: 로그인이 필요합니다.');
    // 실제로 로그아웃 처리
    useAuthStore.getState().logout();
    const { showErrorAlert } = await import('../utils/alertUtils');
    showErrorAlert(
      '세션 만료',
      '세션이 만료되었습니다. 다시 로그인해주세요.',
    );
  }

  // 504 Gateway Timeout 처리
  if (response.status === 504) {
    console.error('서버 응답 시간 초과');
    const { showErrorAlert } = await import('../utils/alertUtils');
    showErrorAlert({
      title: '서버 응답 시간 초과',
      text: '서버와의 연결이 원활하지 않습니다. 잠시 후 다시 시도해주세요.',
      confirmButtonText: '확인',
    });
  }
};

// 헬퍼 함수: 응답 데이터 파싱
const parseResponseData = async (response, responseType) => {
  if (responseType === 'blob') {
    return await response.blob();
  }

  const text = await response.text();
  try {
    return text ? JSON.parse(text) : '';
  } catch {
    return text;
  }
};

const request = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;

  // 기본 헤더 설정
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const { accessToken } = useAuthStore.getState();

  const config = {
    ...options,
    headers: { ...defaultHeaders, ...options.headers },
  };

  if (accessToken) {
    config.headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // FormData인 경우 Content-Type 헤더 제거 (브라우저가 boundary 자동 설정)
  if (config.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  try {
    const response = await fetch(url, config);

    // 상태 코드에 따른 에러 처리 위임
    await handleStatusErrors(response, endpoint);

    // 응답 데이터 파싱 위임
    const data = await parseResponseData(response, options.responseType);

    // 에러 상태 처리
    if (!response.ok) {
      // Axios 에러 구조를 모방하여 호환성 유지
      const error = new Error('API Error');
      error.response = {
        status: response.status,
        data: data,
      };
      throw error;
    }

    // Axios 응답 구조 모방
    return {
      status: response.status,
      data: data,
      headers: response.headers,
    };
  } catch (error) {
    // 이미 처리된 에러(response 속성이 있는 경우)는 그대로 던짐
    if (error.response) throw error;

    // 네트워크 에러 등 fetch 자체 에러 처리
    const wrapperError = new Error(error.message);
    wrapperError.name = error.name; // TypeError etc.
    // Axios 호환성을 위해 code 속성 추가 시도 (선택적)
    if (error.name === 'AbortError') {
      wrapperError.code = 'ECONNABORTED';
    }

    throw wrapperError;
  }
};

const apiClient = {
  get: (url, config = {}) => request(url, { ...config, method: 'GET' }),
  post: (url, data, config = {}) =>
    request(url, {
      ...config,
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
  patch: (url, data, config = {}) =>
    request(url, {
      ...config,
      method: 'PATCH',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
  delete: (url, config = {}) => request(url, { ...config, method: 'DELETE' }),
};

export default apiClient;
