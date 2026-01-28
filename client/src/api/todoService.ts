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
    // .get('/', { query: { date } })
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
    // .get('/search', { query: { startDate, endDate, keyword } })
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
      // 404 is acceptable if no files exist, but here we likely get an array (empty or not)
      // If backend throws for no files, handle specific status codes if needed.
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
    // DELETE / (Batch delete) - expects body: { todoIds: number[] }
    // 기존 todoService는 단건 삭제로 보임 (todoSeq 받음)
    // 백엔드는 다중 삭제만 구현됨 (Step 457)

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
    // GET /export
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
