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
  TodoResponseSchema,
  FileAttachmentResponseSchema,
  type SearchTodoDto,
  type CreateTodoDto,
  type UpdateTodoDto,
  type DeleteTodoDto,
} from './todo.schema';

import { getClientIp } from '../../utils/ip.util';

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
      const userId = Number(user.id);
      const todos = await todoService.findAll(userId, todoDate);

      const result = [];
      for (const todo of todos) {
        const attachments = await todoService.getAttachments(
          todo.todoSeq,
          Number(user.id),
        );
        result.push({
          todoSeq: todo.todoSeq,
          todoContent: todo.todoContent,
          todoDate: todo.todoDate,
          todoNote: todo.todoNote,
          completeDtm: todo.completeDtm ? todo.completeDtm.toISOString() : null,
          attachments: attachments,
          // Entity 직접 접근 (auditColumns 가상 프로퍼티 없음)
          createdAt: todo.auditColumns.regDtm.toISOString(),
        });
      }
      return result;
    },
    {
      query: t.Object({ date: t.Optional(t.String()) }),
      response: t.Array(TodoResponseSchema),
      detail: { tags: ['Todo'], summary: '할 일 목록 조회' },
    },
  )

  // 검색
  .get(
    '/search',
    async ({ user, query, todoService }) => {
      const todos = await todoService.search(
        Number(user.id),
        query as SearchTodoDto,
      );
      const result = [];
      for (const todo of todos) {
        const attachments = await todoService.getAttachments(
          todo.todoSeq,
          Number(user.id),
        );
        result.push({
          todoSeq: todo.todoSeq,
          todoContent: todo.todoContent,
          todoDate: todo.todoDate,
          todoNote: todo.todoNote,
          completeDtm: todo.completeDtm ? todo.completeDtm.toISOString() : null,
          attachments,
          createdAt: todo.auditColumns.regDtm.toISOString(),
        });
      }
      return result;
    },
    {
      query: SearchTodoSchema,
      response: t.Array(TodoResponseSchema),
      detail: { tags: ['Todo'], summary: '할 일 검색' },
    },
  )

  // 생성
  .post(
    '/',
    async ({ user, body, todoService, request, set }) => {
      const clientIp = getClientIp(request);
      const newTodo = await todoService.create(
        Number(user.id),
        clientIp,
        body as CreateTodoDto,
      );

      // 응답 생성
      const attachments = await todoService.getAttachments(
        newTodo.todoSeq,
        Number(user.id),
      );
      set.status = 201;
      return {
        todoSeq: newTodo.todoSeq,
        todoContent: newTodo.todoContent,
        todoDate: newTodo.todoDate,
        todoNote: newTodo.todoNote,
        completeDtm: newTodo.completeDtm
          ? newTodo.completeDtm.toISOString()
          : null,
        attachments,
        createdAt: newTodo.auditColumns.regDtm.toISOString(),
      };
    },
    {
      body: CreateTodoSchema,
      response: { 201: TodoResponseSchema },
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
        Number(user.id),
        clientIp,
        body as UpdateTodoDto,
      );

      const attachments = await todoService.getAttachments(
        updatedTodo.todoSeq,
        Number(user.id),
      );
      return {
        todoSeq: updatedTodo.todoSeq,
        todoContent: updatedTodo.todoContent,
        todoDate: updatedTodo.todoDate,
        todoNote: updatedTodo.todoNote,
        completeDtm: updatedTodo.completeDtm
          ? updatedTodo.completeDtm.toISOString()
          : null,
        attachments,
        createdAt: updatedTodo.auditColumns.regDtm.toISOString(),
      };
    },
    {
      body: UpdateTodoSchema,
      params: t.Object({ id: t.Number() }),
      response: TodoResponseSchema,
      detail: { tags: ['Todo'], summary: '할 일 수정' },
    },
  )

  // 삭제
  .delete(
    '/',
    async ({ user, body, todoService, request }) => {
      const clientIp = getClientIp(request);
      const { todoIds } = body as DeleteTodoDto;
      await todoService.delete(todoIds, Number(user.id), clientIp);
      return { success: true };
    },
    {
      body: DeleteTodoSchema,
      detail: { tags: ['Todo'], summary: '할 일 삭제' },
    },
  )

  // 첨부파일 목록 조회
  .get(
    '/:id/file',
    async ({ user, params: { id }, todoService }) => {
      const attachments = await todoService.getAttachments(
        Number(id),
        Number(user.id),
      );
      return attachments;
    },
    {
      params: t.Object({ id: t.Number() }),
      response: t.Array(FileAttachmentResponseSchema),
      detail: { tags: ['Todo'], summary: '첨부파일 목록 조회' },
    },
  )

  // 첨부파일 삭제
  .delete(
    '/:id/file/:fileNo',
    async ({ user, params: { id, fileNo }, todoService }) => {
      await todoService.deleteAttachment(
        Number(id),
        Number(fileNo),
        Number(user.id),
      );
      return { success: true };
    },
    {
      params: t.Object({
        id: t.Number(),
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
        Number(user.id),
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
