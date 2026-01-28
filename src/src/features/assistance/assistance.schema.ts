import { t, Static } from 'elysia';

/**
 * 대화 요청 스키마
 */
export const ChatRequestSchema = t.Object({
  prompt: t.String({
    minLength: 1,
    description: '사용자 메시지',
  }),
  history: t.Optional(
    t.Array(
      t.Object({
        role: t.Union([t.Literal('user'), t.Literal('model')]),
        parts: t.Array(t.Object({ text: t.String() })),
      }),
      { description: '대화 기록' },
    ),
  ),
});
export type ChatRequestDto = Static<typeof ChatRequestSchema>;

/**
 * 대화 응답 스키마
 */
export const ChatResponseSchema = t.Object({
  response: t.String({ description: 'AI 응답 (HTML 형식)' }),
  timestamp: t.String({ description: '응답 시간' }),
  success: t.Boolean({ description: '성공 여부' }),
  error: t.Optional(t.String({ description: '오류 메시지' })),
});
export type ChatResponseDto = Static<typeof ChatResponseSchema>;

/**
 * Function Call Arguments 스키마
 */
// getTodos 인자 스키마
export const GetTodosArgsSchema = t.Object({
  status: t.Optional(t.String({ description: '할 일 상태' })),
  days: t.Optional(t.Number({ description: '조회 기간(일)' })),
});
export type GetTodosArgs = Static<typeof GetTodosArgsSchema>;

// createTodo 인자 스키마
export const CreateTodoArgsSchema = t.Object({
  todoContent: t.String({ description: '할 일 내용' }),
  todoDate: t.String({ description: '할 일 날짜 (YYYY-MM-DD)' }),
  todoNote: t.Optional(t.String({ description: '할 일 메모' })),
});
export type CreateTodoArgs = Static<typeof CreateTodoArgsSchema>;

// updateTodo 인자 스키마
export const UpdateTodoArgsSchema = t.Object({
  todoSeq: t.Optional(t.Number({ description: '할 일 ID' })),
  todoContentToFind: t.Optional(t.String({ description: '검색할 내용' })),
  todoContent: t.Optional(t.String({ description: '새로운 내용' })),
  isCompleted: t.Optional(t.Boolean({ description: '완료 여부' })),
  todoNote: t.Optional(t.String({ description: '새로운 메모' })),
});
export type UpdateTodoArgs = Static<typeof UpdateTodoArgsSchema>;

/**
 * Function Call Response 스키마
 */
// getTodos 응답 스키마
export const GetTodosResponseSchema = t.Object({
  count: t.Number({ description: '할 일 개수' }),
  todos: t.Array(
    t.Object({
      id: t.Number({ description: '할 일 ID' }),
      content: t.String({ description: '할 일 내용' }),
      date: t.String({ description: '할 일 날짜' }),
      completed: t.Boolean({ description: '완료 여부' }),
    }),
  ),
});
export type GetTodosResponse = Static<typeof GetTodosResponseSchema>;

// 에러 응답 스키마
export const ErrorResponseSchema = t.Object({
  error: t.String({ description: '에러 메시지' }),
});
export type ErrorResponse = Static<typeof ErrorResponseSchema>;

/**
 * 타입 가드: HTTP Error 타입 체크
 */
export interface HttpError {
  status?: number;
  response?: {
    status: number;
    headers?: Record<string, string>;
  };
  message?: string;
  code?: string;
}

/**
 * 타입 가드 함수: unknown을 HttpError로 좁히기
 */
export function isHttpError(error: unknown): error is HttpError {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const err = error as Record<string, unknown>;

  // status 또는 response.status가 있으면 HttpError로 간주
  return (
    typeof err.status === 'number' ||
    (typeof err.response === 'object' &&
      err.response !== null &&
      typeof (err.response as Record<string, unknown>).status === 'number')
  );
}

/**
 * 타입 가드 함수: Error 타입 체크
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}
