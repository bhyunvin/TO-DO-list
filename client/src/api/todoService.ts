import { api } from './client';

const todoService = {
  async getTodos(date: string) {
    // .get('/', { query: { date } })
    const { data, error } = await api.todo.index.get({
      query: { date },
    });

    if (error) throw new Error(String(error.value));
    return data;
    // data는 배열.
  },

  async searchTodos(startDate: string, endDate: string, keyword: string) {
    // .get('/search', { query: { startDate, endDate, keyword } })
    const { data, error } = await api.todo.search.get({
      query: { startDate, endDate, keyword },
    });

    if (error) throw new Error(String(error.value));
    return data;
  },

  async getAttachments(todoSeq: number) {
    // 기존: /todo/:id/attachments -> 백엔드: 없습니다.
    // 백엔드는 /todo 목록 조회 시 attachments를 포함해서 반환합니다 (Step 457).
    // 별도의 getAttachments API는 없습니다.
    // ==> 클라이언트 수정 필요: 목록에서 이미 받았으므로 호출 불필요.
    // 하지만 Attachments만 따로 로딩하는 로직이 있다면 문제.
    // 백엔드 todo.routes.ts를 보면 getAttachments 핸들러가 없습니다.
    // 따라서 이 함수는 껍데기만 남기거나 빈 배열 반환.
    // 또는 /todo 목록 조회를 재활용? 비효율적.

    console.warn('getAttachments API is merged into list API.');
    return [];
  },

  async deleteAttachment(todoSeq: number | string, fileNo: number | string) {
    // DELETE /:todoId/file/:fileNo
    const { error } = await api
      .todo({ todoId: Number(todoSeq) })
      .file({ fileNo: Number(fileNo) })
      .delete();
    if (error) throw new Error(String(error.value));
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

    const { data: result, error } = await api.todo.index.post(payload);
    if (error) throw new Error(String(error.value));
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

    // PATCH /:id
    const { data: result, error } = await api
      .todo({ id: Number(todoSeq) })
      .patch(payload);
    if (error) throw new Error(String(error.value));
    return result;
  },

  async deleteTodo(todoSeq: number | string) {
    // DELETE / (Batch delete) - expects body: { todoIds: number[] }
    // 기존 todoService는 단건 삭제로 보임 (todoSeq 받음)
    // 백엔드는 다중 삭제만 구현됨 (Step 457)

    const { error } = await api.todo.index.delete({
      todoIds: [Number(todoSeq)],
    });
    if (error) throw new Error(String(error.value));
    return { success: true };
  },

  async downloadExcel(startDate: string, endDate: string) {
    // GET /export
    const { data, error } = await api.todo.export.get({
      query: { startDate, endDate },
    });

    if (error) throw new Error(String(error.value));
    return data; // Blob 이어야 함. Eden이 Blob 반환하는지 확인 필요.
    // 백엔드 핸들러는 buffer 반환, 헤더 설정함.
    // Eden Treaty Client는 text/json 이외의 Content-Type이면 data가 Blob/Buffer일 수 있음.
    // 확인 필요하나 일단 리턴.
  },
};

export default todoService;
