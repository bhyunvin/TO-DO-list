import { t, Static } from 'elysia';

/**
 * 할 일 생성 스키마
 */
export const CreateTodoSchema = t.Object({
  todoContent: t.String({ description: '할 일 내용' }),
  todoDate: t.String({ description: '할 일 날짜 (YYYY-MM-DD)' }),
  todoNote: t.Optional(t.String({ description: '비고' })),
  files: t.Optional(
    t.Files({
      description: '첨부파일',
      maxSize: 10 * 1024 * 1024, // 10MB
    }),
  ),
});
export type CreateTodoDto = Static<typeof CreateTodoSchema>;

/**
 * 할 일 수정 스키마
 */
export const UpdateTodoSchema = t.Object({
  todoContent: t.Optional(t.Nullable(t.String({ description: '할 일 내용' }))),
  todoDate: t.Optional(
    t.Nullable(t.String({ description: '할 일 날짜 (YYYY-MM-DD)' })),
  ),
  completeDtm: t.Optional(t.Nullable(t.String({ description: '완료 일시' }))), // 완료 처리는 날짜 문자열 전송
  todoNote: t.Optional(t.Nullable(t.String({ description: '비고' }))),
  files: t.Optional(
    t.Files({
      description: '추가 첨부파일',
      maxSize: 10 * 1024 * 1024,
    }),
  ),
});
export type UpdateTodoDto = Static<typeof UpdateTodoSchema>;

/**
 * 할 일 삭제 스키마
 */
export const DeleteTodoSchema = t.Object({
  todoIds: t.Array(t.Number(), { description: '삭제할 할 일 ID 목록' }),
});
export type DeleteTodoDto = Static<typeof DeleteTodoSchema>;

/**
 * 할 일 검색 스키마
 */
export const SearchTodoSchema = t.Object({
  startDate: t.String({ description: '검색 시작일' }),
  endDate: t.String({ description: '검색 종료일' }),
  keyword: t.Optional(t.String({ description: '검색어' })),
});
export type SearchTodoDto = Static<typeof SearchTodoSchema>;

/**
 * 파일 첨부 응답 스키마
 */
export const FileAttachmentResponseSchema = t.Object({
  fileNo: t.Number(),
  originalFileName: t.String(),
  fileSize: t.Number(),
  fileExt: t.String(),
  uploadDate: t.Date(),
});

/**
 * 할 일 응답 스키마
 */
export const TodoResponseSchema = t.Object({
  todoSeq: t.Number(),
  todoContent: t.Nullable(t.String()), // DB entity 정의상 nullable
  todoDate: t.Nullable(t.String()),
  todoNote: t.Nullable(t.String()),
  completeDtm: t.Nullable(t.String()),
  attachments: t.Array(FileAttachmentResponseSchema),
  createdAt: t.String(),
});
