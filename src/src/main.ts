import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';

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
    credentials: true,
  });

  await app.listen(process.env.PORT || 3001, '0.0.0.0');
};

bootstrap();
