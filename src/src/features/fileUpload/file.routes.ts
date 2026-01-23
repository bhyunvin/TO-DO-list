import { Elysia, t } from 'elysia';
import { jwtPlugin } from '../../plugins/jwt';
import { databasePlugin } from '../../plugins/database';
import { FileInfoEntity } from '../../fileUpload/file.entity';
import { TodoEntity } from '../todo/todo.entity';
import { UserEntity } from '../user/user.entity';
import { existsSync } from 'node:fs';

export const fileRoutes = new Elysia({ prefix: '/file' })
  .use(databasePlugin)
  .use(jwtPlugin)
  .onBeforeHandle(({ user }) => {
    if (!user) throw new Error('Unauthorized');
  })

  .get(
    '/:fileNo',
    async ({ params: { fileNo }, user, db, set }) => {
      const fileInfoRepo = db.getRepository(FileInfoEntity);
      const todoRepo = db.getRepository(TodoEntity);
      const userRepo = db.getRepository(UserEntity);

      const fileInfo = await fileInfoRepo.findOne({
        where: { fileNo: Number(fileNo) },
      });

      if (!fileInfo) {
        set.status = 404;
        throw new Error('파일을 찾을 수 없습니다.');
      }

      const userSeq = Number(user.id);

      // 권한 체크
      const hasTodoAccess = await todoRepo.count({
        where: {
          todoFileGroupNo: fileInfo.fileGroupNo,
          userSeq,
        },
      });

      const hasProfileAccess = await userRepo.count({
        where: {
          userProfileImageFileGroupNo: fileInfo.fileGroupNo,
          userSeq,
        },
      });

      if (hasTodoAccess === 0 && hasProfileAccess === 0) {
        set.status = 403;
        throw new Error('접근 권한이 없습니다.');
      }

      const filePath = fileInfo.filePath;

      // Cloudinary 리다이렉트
      if (filePath?.startsWith('http')) {
        return Response.redirect(filePath);
      }

      // 로컬 파일
      if (!existsSync(filePath)) {
        set.status = 404;
        throw new Error('파일이 서버에 존재하지 않습니다.');
      }

      return Bun.file(filePath);
    },
    {
      params: t.Object({ fileNo: t.Number() }),
      detail: {
        tags: ['File'],
        summary: '파일 다운로드/조회',
      },
    },
  );
