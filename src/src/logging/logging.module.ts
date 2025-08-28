import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogEntity } from './logging.entity';
import { LoggerService } from './logging.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LogEntity]), // LoggerService가 쓸 Repository를 여기서 등록
  ],
  providers: [LoggerService],
  exports: [LoggerService], // 다른 모듈에서도 LoggerService를 쓸 수 있도록 export
})
export class LoggingModule {}
