import { CreateAuditColumns } from '../utils/auditColumns';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('nj_user_log')
export class LogEntity {
  constructor() {
    this.auditColumns = new CreateAuditColumns(); // auditColumns을 초기화
  }

  @PrimaryGeneratedColumn({ name: 'log_seq' })
  logSeq: number;

  @Column({ name: 'user_seq', nullable: true })
  userSeq: number;

  @Column({ name: 'connect_url', type: 'text' })
  connectUrl: string;

  @Column({ name: 'error_content', type: 'text', nullable: true })
  errorContent: string;

  @Column({ name: 'method', type: 'varchar', length: 10 })
  method: string;

  @Column({ name: 'request_body', type: 'text', nullable: true })
  requestBody: string;

  @Column(() => CreateAuditColumns) // 복합 엔티티를 포함
  auditColumns: CreateAuditColumns;
}
