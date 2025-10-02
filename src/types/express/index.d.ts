import 'express-session';
import { UserEntity } from '../../src/user/user.entity';

declare module 'express-session' {
  interface SessionData {
    // user 객체 전체를 저장하되, 보안을 위해 비밀번호는 제외합니다.
    user?: Omit<UserEntity, 'userPassword'>;
  }
}
