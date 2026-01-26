import { api } from './client';

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

/**
 * Treaty API 타입 제약 관련:
 * 
 * Elysia의 Treaty 클라이언트는 복잡한 동적 라우팅 구조에서 TypeScript 타입 추론에 한계가 있습니다.
 * 백엔드의 App 타입을 제대로 import하고 treaty<App>()로 명시해도, 
 * 실제 API 호출 시점에 타입이 올바르게 추론되지 않는 Treaty의 알려진 제약사항입니다.
 * 
 * 런타임에는 정상 작동하지만, TypeScript 컴파일 타임에 타입 에러가 발생합니다.
 * 따라서 불가피하게 any 타입을 사용하되, 실제 반환값은 백엔드 응답 타입과 일치합니다.
 * 
 * @see https://github.com/elysiajs/eden/issues - Treaty type inference limitations
 */
 
const todoApi = api.todo as any;

const todoService = {
  async getTodos(date: string) {
    // .get('/', { query: { date } })
    const { data, error } = await todoApi.get({
      query: { date },
    });

    if (error) {
      throw new Error(
        typeof error.value === 'string'
          ? error.value
          : JSON.stringify(error.value),
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
      throw new Error(
        typeof error.value === 'string'
          ? error.value
          : JSON.stringify(error.value),
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
      throw new Error(
        typeof error.value === 'string'
          ? error.value
          : JSON.stringify(error.value),
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
      throw new Error(
        typeof error.value === 'string'
          ? error.value
          : JSON.stringify(error.value),
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
      throw new Error(
        typeof error.value === 'string'
          ? error.value
          : JSON.stringify(error.value),
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
      throw new Error(
        typeof error.value === 'string'
          ? error.value
          : JSON.stringify(error.value),
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
      throw new Error(
        typeof error.value === 'string'
          ? error.value
          : JSON.stringify(error.value),
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
      throw new Error(
        typeof error.value === 'string'
          ? error.value
          : JSON.stringify(error.value),
      );
    }
    return data;
  },
};

export default todoService;
