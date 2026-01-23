import { t, Static } from 'elysia';

export const ContactEmailSchema = t.Object({
  title: t.String({ description: '문의 제목' }),
  content: t.String({ description: '문의 내용' }),
  file: t.Optional(t.File({ description: '첨부파일' })),
});

export type ContactEmailDto = Static<typeof ContactEmailSchema>;
