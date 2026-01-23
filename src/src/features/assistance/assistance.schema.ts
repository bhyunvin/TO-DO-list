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
