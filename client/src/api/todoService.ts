import { api, ApiError, API_URL } from './client';
import { useAuthStore } from '../authStore/authStore';

// DTO 타입 정의 (백엔드 스키마와 일치시키는 것이 좋지만, 여기서는 인터페이스 정의)
// 실제로는 shared 패키지나 스키마 파일에서 가져오는 것이 이상적
export interface CreateTodoDto {
  todoContent: string;
  todoDate: string;
  todoNote?: string;
  files?: File[];
}

export interface UpdateTodoDto {
  todoContent?: string;
  completeDtm?: string;
  todoNote?: string;
  files?: File[];
}

const todoApi = api.todo;

const todoService = {
  async getTodos(date: string) {
    // 할 일 목록 조회 (GET /)
    const { data, error } = await api.todo.get({
      query: { date },
    });

    if (error) {
      throw new ApiError(
        typeof error.value === 'string' ? error.value : '할 일 목록 조회 실패',
        Number(error.status),
        error.value,
      );
    }
    return data;
  },

  async searchTodos(startDate: string, endDate: string, keyword: string) {
    // 할 일 검색 (GET /search)
    const { data, error } = await api.todo.search.get({
      query: { startDate, endDate, keyword },
    });

    if (error) {
      throw new ApiError(
        typeof error.value === 'string' ? error.value : '검색 실패',
        Number(error.status),
        error.value,
      );
    }
    return data;
  },

  async getAttachments(todoSeq: number | string) {
    const id = Number(todoSeq);
    const { data, error } = await api.todo({ id }).file.get();

    if (error) {
      throw new ApiError(
        typeof error.value === 'string' ? error.value : '첨부파일 조회 실패',
        Number(error.status),
        error.value,
      );
    }
    return data;
  },

  async deleteAttachment(todoSeq: number | string, fileNo: number | string) {
    const id = Number(todoSeq);
    const fNo = Number(fileNo);

    const { error } = await api.todo({ id }).file({ fileNo: fNo }).delete();
    if (error) {
      throw new ApiError(
        typeof error.value === 'string' ? error.value : '첨부파일 삭제 실패',
        Number(error.status),
        error.value,
      );
    }
  },

  async createTodo(data: CreateTodoDto | FormData) {
    let payload: unknown = data;
    if (data instanceof FormData) {
      const files = data.getAll('files') as File[];
      const obj = Object.fromEntries(data.entries());
      payload = {
        ...obj,
        files: files.length > 0 ? files : undefined,
      };
    }

    const { data: result, error } = await api.todo.post(payload);
    if (error) {
      throw new ApiError(
        typeof error.value === 'string' ? error.value : '할 일 생성 실패',
        Number(error.status),
        error.value,
      );
    }
    return result;
  },

  async updateTodo(todoSeq: number | string, data: UpdateTodoDto | FormData) {
    let payload: unknown = data;
    if (data instanceof FormData) {
      const files = data.getAll('files') as File[];
      const obj = Object.fromEntries(data.entries());
      payload = {
        ...obj,
        files: files.length > 0 ? files : undefined,
      };
    }

    const id = Number(todoSeq);
    const { data: result, error } = await api.todo({ id }).patch(payload);
    if (error) {
      throw new ApiError(
        typeof error.value === 'string' ? error.value : '할 일 수정 실패',
        Number(error.status),
        error.value,
      );
    }
    return result;
  },

  async deleteTodo(todoSeq: number | string) {
    const { error } = await api.todo.delete({
      todoIds: [Number(todoSeq)],
    });
    if (error) {
      throw new ApiError(
        typeof error.value === 'string' ? error.value : '할 일 삭제 실패',
        Number(error.status),
        error.value,
      );
    }
    return { success: true };
  },

  async downloadExcel(startDate: string, endDate: string) {
    // 엑셀 내보내기 (GET /export)
    const { data, error } = await todoApi.export.get({
      query: { startDate, endDate },
    });

    if (error) {
      throw new ApiError(
        typeof error.value === 'string' ? error.value : '내보내기 실패',
        Number(error.status),
        error.value,
      );
    }
    return data as Blob;
  },

  async getFile(fileNo: number | string) {
    // 개별 파일 조회 (GET /file/:fileNo)
    // Eden Treaty 대신 기본 fetch를 사용하여 Blob 응답을 안정적으로 처리합니다.
    const { accessToken } = useAuthStore.getState();
    const headers = new Headers();
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const response = await fetch(`${API_URL}/file/${fileNo}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new ApiError('파일 조회 실패', response.status, null);
    }

    return await response.blob();
  },
};

export default todoService;
