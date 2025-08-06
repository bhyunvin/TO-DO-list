import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';

//DB
import { TypeOrmModule } from '@nestjs/typeorm';
import { ormconfig } from './ormconfig';

//interceptor
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './interceptor/logging.interceptor';

//filter
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './filter/http-exception.filter';

//logging
import { LoggerService } from './logging/logging.service';
import { LogEntity } from './logging/logging.entity';

//로그인
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';
import { UserEntity } from './user/user.entity';

//session
import session from 'express-session';

//file upload
import { FileUploadUtil } from './fileUpload/fileUploadUtil';
import { FileInfoEntity } from './fileUpload/file.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot(ormconfig),
    TypeOrmModule.forFeature([UserEntity, LogEntity, FileInfoEntity]),
  ],
  controllers: [UserController],
  providers: [
    UserService,
    LoggerService,
    FileUploadUtil,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        session({
          secret: 'my-todo-app-key', // 비밀 키
          resave: false,
          saveUninitialized: true,
          cookie: { secure: false }, // HTTPS에서 secure: true로 설정
        }),
      )
      .forRoutes('*'); // 모든 경로에 적용
  }
}
