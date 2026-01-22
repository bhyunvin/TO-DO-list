import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule, new ExpressAdapter());

  // 프록시 신뢰 설정 추가
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  const origins = ['http://localhost:5173'];
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
  }

  app.enableCors({
    origin: origins,
    methods: 'GET,POST,PATCH,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });

  // 글로벌 파이프 설정 (자동 변환 및 유효성 검사, 화이트리스트 적용)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 속성은 제거함
      forbidNonWhitelisted: true, // DTO에 없는 속성이 들어오면 요청 자체를 거부함
      transform: true, // 데이터를 지정한 타입으로 자동 변환함
    }),
  );

  const PORT = process.env.PORT || 3001;
  await app.listen(PORT, '0.0.0.0');
};

bootstrap();
