import { api, ApiError } from './client';

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
    const { data, error } = await todoApi.get({
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
    // data는 배열.
  },

  async searchTodos(startDate: string, endDate: string, keyword: string) {
    // 할 일 검색 (GET /search)
    const { data, error } = await todoApi.search.get({
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
    const idStr = String(todoSeq);
    const { data, error } = await todoApi[idStr].file.get();

    if (error) {
      // 파일이 하나도 없는 경우 404가 발생할 수 있음.
      // 필요에 따라 백엔드에서 파일 없음 에러를 던지는 로직을 처리.
      throw new ApiError(
        typeof error.value === 'string' ? error.value : '첨부파일 조회 실패',
        Number(error.status),
        error.value,
      );
    }
    return data;
  },

  async deleteAttachment(todoSeq: number | string, fileNo: number | string) {
    const todoIdStr = String(todoSeq);
    const fileNoStr = String(fileNo);

    // Eden Treaty: /todo에서 동적 경로 [todoId]를 문자열 indexing으로 접근
    // todoApi가 any이므로 indexing 가능
    const { error } = await todoApi[todoIdStr].file[fileNoStr].delete();
    if (error) {
      throw new ApiError(
        typeof error.value === 'string' ? error.value : '첨부파일 삭제 실패',
        Number(error.status),
        error.value,
      );
    }
  },

  async createTodo(data: CreateTodoDto | FormData) {
    let payload = data;
    if (data instanceof FormData) {
      const files = data.getAll('files') as File[];
      const obj = Object.fromEntries(data.entries());
      payload = {
        ...obj,
        files: files.length > 0 ? files : undefined,
      } as CreateTodoDto;
    }

    const { data: result, error } = await todoApi.post(payload);
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
    let payload = data;
    if (data instanceof FormData) {
      const files = data.getAll('files') as File[];
      const obj = Object.fromEntries(data.entries());
      payload = {
        ...obj,
        files: files.length > 0 ? files : undefined,
      } as UpdateTodoDto;
    }

    const idStr = String(todoSeq);

    // Eden Treaty: /todo에서 동적 경로 [id]를 문자열 indexing으로 접근
    const { data: result, error } = await todoApi[idStr].patch(payload);
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
    // 대량 삭제 - 본문(body)에 { todoIds: number[] } 형식을 기대합니다.
    // 기존 todoService는 단건 삭제로 보임 (todoSeq 받음)
    // 백엔드는 현재 다중 삭제로 구현되어 있습니다.

    const { error } = await todoApi.delete({
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
};

export default todoService;
