import { Elysia, t } from 'elysia';
import { jwtPlugin } from '../../plugins/jwt';
import { databasePlugin } from '../../plugins/database';
import { TodoService } from './todo.service';
import { CloudinaryService } from '../../fileUpload/cloudinary.service';
import {
  CreateTodoSchema,
  UpdateTodoSchema,
  DeleteTodoSchema,
  SearchTodoSchema,
} from './todo.schema';

// 헬퍼 함수: 요청에서 IP 추출
const getClientIp = (req: Request): string => {
  return req.headers.get('x-forwarded-for') || '127.0.0.1';
};

export const todoRoutes = new Elysia({ prefix: '/todo' })
  .use(databasePlugin)
  .use(jwtPlugin)
  .derive(({ db }) => ({
    todoService: new TodoService(db, new CloudinaryService()),
  }))
  .onBeforeHandle(({ user }) => {
    if (!user) throw new Error('Unauthorized');
  })

  // 목록 조회
  .get(
    '/',
    async ({ user, query, todoService }) => {
      const todoDate = query.date || null;
      // jwtPlugin user payload has 'sub' not 'id'
      const todos = await todoService.findAll(Number((user as any)!.sub), todoDate);

      const result = [];
      for (const todo of todos) {
        const attachments = await todoService.getAttachments(
          todo.todoSeq,
          Number((user as any)!.sub),
        );
        result.push({
          todoSeq: todo.todoSeq,
          todoContent: todo.todoContent,
          todoDate: todo.todoDate,
          todoNote: todo.todoNote,
          completeDtm: todo.completeDtm,
          attachments: attachments,
          // Entity 직접 접근 (auditColumns 가상 프로퍼티 없음)
          createdAt: todo.regDtm.toISOString(),
        });
      }
      return result;
    },
    {
      query: t.Object({ date: t.Optional(t.String()) }),
      detail: { tags: ['Todo'], summary: '할 일 목록 조회' },
    },
  )

  // 검색
  .get(
    '/search',
    async ({ user, query, todoService }) => {
      const todos = await todoService.search(Number((user as any)!.sub), query);
      const result = [];
      for (const todo of todos) {
        const attachments = await todoService.getAttachments(
          todo.todoSeq,
          Number((user as any)!.sub),
        );
        result.push({
          todoSeq: todo.todoSeq,
          todoContent: todo.todoContent,
          todoDate: todo.todoDate,
          todoNote: todo.todoNote,
          completeDtm: todo.completeDtm,
          attachments,
          createdAt: todo.regDtm.toISOString(),
        });
      }
      return result;
    },
    {
      query: SearchTodoSchema,
      detail: { tags: ['Todo'], summary: '할 일 검색' },
    },
  )

  // 생성
  .post(
    '/',
    async ({ user, body, todoService, request, set }) => {
      const clientIp = getClientIp(request);
      const newTodo = await todoService.create(
        Number((user as any)!.sub),
        clientIp,
        body as any,
      );

      // 응답 생성
      const attachments = await todoService.getAttachments(
        newTodo.todoSeq,
        Number((user as any)!.sub),
      );
      set.status = 201;
      return {
        todoSeq: newTodo.todoSeq,
        todoContent: newTodo.todoContent,
        todoDate: newTodo.todoDate,
        todoNote: newTodo.todoNote,
        completeDtm: newTodo.completeDtm,
        attachments,
        createdAt: newTodo.regDtm.toISOString(),
      };
    },
    {
      body: CreateTodoSchema,
      detail: { tags: ['Todo'], summary: '할 일 생성' },
    },
  )

  // 수정
  .patch(
    '/:id',
    async ({ user, params: { id }, body, todoService, request }) => {
      const clientIp = getClientIp(request);
      const updatedTodo = await todoService.update(
        Number(id),
        Number((user as any)!.sub),
        clientIp,
        body as any,
      );

      const attachments = await todoService.getAttachments(
        updatedTodo.todoSeq,
        Number((user as any)!.sub),
      );
      return {
        todoSeq: updatedTodo.todoSeq,
        todoContent: updatedTodo.todoContent,
        todoDate: updatedTodo.todoDate,
        todoNote: updatedTodo.todoNote,
        completeDtm: updatedTodo.completeDtm,
        attachments,
        createdAt: updatedTodo.regDtm.toISOString(),
      };
    },
    {
      body: UpdateTodoSchema,
      params: t.Object({ id: t.Number() }),
      detail: { tags: ['Todo'], summary: '할 일 수정' },
    },
  )

  // 삭제
  .delete(
    '/',
    async ({ user, body, todoService, request }) => {
      const clientIp = getClientIp(request);
      // body.todoIds 접근을 위해 any 캐스팅
      await todoService.delete((body as any).todoIds, Number((user as any)!.sub), clientIp);
      return { success: true };
    },
    {
      body: DeleteTodoSchema,
      detail: { tags: ['Todo'], summary: '할 일 삭제' },
    },
  )

  // 첨부파일 삭제
  .delete(
    '/:todoId/file/:fileNo',
    async ({ user, params: { todoId, fileNo }, todoService }) => {
      await todoService.deleteAttachment(
        Number(todoId),
        Number(fileNo),
        Number((user as any)!.sub),
      );
      return { success: true };
    },
    {
      params: t.Object({
        todoId: t.Number(),
        fileNo: t.Number(),
      }),
      detail: { tags: ['Todo'], summary: '첨부파일 삭제' },
    },
  )

  // 엑셀 다운로드
  .get(
    '/export',
    async ({ user, query, todoService, set }) => {
      const buffer = await todoService.exportToExcel(
        Number((user as any)!.sub),
        query.startDate,
        query.endDate,
      );

      set.headers['Content-Type'] =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      set.headers['Content-Disposition'] =
        `attachment; filename=todos_${query.startDate}_${query.endDate}.xlsx`;

      return buffer;
    },
    {
      query: t.Object({
        startDate: t.String(),
        endDate: t.String(),
      }),
      detail: { tags: ['Todo'], summary: '엑셀 다운로드' },
    },
  );
