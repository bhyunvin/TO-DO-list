import { AuditColumns } from '../utils/auditColumns';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('nj_user_log')
export class LogEntity {
  constructor() {
    this.auditColumns = new AuditColumns(); // auditColumns을 초기화
  }

  @PrimaryGeneratedColumn({ name: 'log_seq' })
  logSeq: number;

  @Column({ name: 'user_seq', nullable: true })
  userSeq: number;

  @Column({ name: 'connect_url', length: 4000 })
  connectUrl: string;

  @Column({ name: 'error_content', length: 'max', nullable: true })
  errorContent: string;

  @Column(() => AuditColumns) // 복합 엔티티를 포함
  auditColumns: AuditColumns;
}
