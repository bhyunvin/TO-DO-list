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
import { LoggingModule } from './logging/logging.module';

//로그인
import { UserModule } from './user/user.module';

//session
import session from 'express-session';

//file upload
import { FileUploadUtil } from './fileUpload/fileUploadUtil';
import { FileUploadModule } from './fileUpload/fileUpload.module';

// ai assistance
import { AssistanceModule } from './assistance/assistance.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(ormconfig),
    AssistanceModule,
    UserModule,
    LoggingModule,
    FileUploadModule,
  ],
  providers: [
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
