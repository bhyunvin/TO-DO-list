import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TodoService } from './todo.service';
import { TodoController } from './todo.controller';
import { TodoEntity } from './todo.entity';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../../types/express/auth.module';
import { FileUploadModule } from '../fileUpload/fileUpload.module';
import { FileInfoEntity } from '../fileUpload/file.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TodoEntity, FileInfoEntity]), // TodoEntity와 FileInfoEntity를 TypeOrmModule에 등록합니다.
    UserModule,
    AuthModule, // 인증 가드를 사용하기 위해 AuthModule을 import합니다.
    FileUploadModule, // 파일 업로드 기능을 사용하기 위해 FileUploadModule을 import합니다.
  ],
  controllers: [TodoController], // TodoController를 이 모듈의 컨트롤러로 등록합니다.
  providers: [TodoService], // TodoService를 이 모듈의 프로바이더로 등록합니다.
})
export class TodoModule {}
