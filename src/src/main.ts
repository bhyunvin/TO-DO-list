import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';

//npm run start:dev 으로 기동
async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter());

  // 허용할 출처(Origin)를 정규식으로 정의
  // -> http://localhost:3000 또는 http://192.168.30.xxx:3000 형태의 주소를 허용
  const allowedOrigins = /^http:\/\/(localhost|192\.168\.30\.[0-9]{1,3}):3000$/;

  // CORS 설정
  app.enableCors({
    origin: (origin, callback) => {
      // Postman 같은 툴이나 서버 간 통신 등 origin이 없는 경우 허용
      if (!origin) {
        return callback(null, true);
      }
      // 정규식에 맞는 경우 허용
      if (allowedOrigins.test(origin)) {
        return callback(null, true);
      }
      // 그 외에는 에러 발생
      return callback(new Error('Not allowed by CORS'));
    },
    methods: 'GET,POST,DELETE',
    credentials: true,
  });

  // 서버 시작
  await app.listen(3001);
}

bootstrap();
