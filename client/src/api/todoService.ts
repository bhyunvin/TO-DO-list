import { api } from './client';

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

  async createTodo(data: any) {
    let payload = data;
    if (data instanceof FormData) {
      const files = data.getAll('files');
      const obj = Object.fromEntries(data.entries());
      payload = {
        ...obj,
        files: files.length > 0 ? files : undefined,
      };
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

  async updateTodo(todoSeq: number | string, data: any) {
    let payload = data;
    if (data instanceof FormData) {
      const files = data.getAll('files');
      const obj = Object.fromEntries(data.entries());
      payload = {
        ...obj,
        files: files.length > 0 ? files : undefined,
      };
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
    return data; // Blob 이어야 함. Eden이 Blob 반환하는지 확인 필요.
    // 백엔드 핸들러는 buffer 반환, 헤더 설정함.
    // Eden Treaty Client는 text/json 이외의 Content-Type이면 data가 Blob/Buffer일 수 있음.
    // 확인 필요하나 일단 리턴.
  },
};

export default todoService;
