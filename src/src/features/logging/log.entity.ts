import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { CreateAuditColumns } from '../../utils/auditColumns';

@Entity('nj_user_log')
@Index('IX_NJ_USER_LOG_REG_DTM', ['auditColumns.regDtm'])
@Index('IX_NJ_USER_LOG_USER_SEQ', ['userSeq'])
export class LogEntity {
  constructor() {
    this.auditColumns = new CreateAuditColumns();
  }

  @PrimaryGeneratedColumn({ name: 'log_seq' })
  logSeq: number;

  @Column({ name: 'user_seq', type: 'int', nullable: true })
  userSeq: number;

  @Column({ name: 'connect_url', type: 'text', nullable: true })
  connectUrl: string;

  @Column({
    name: 'connect_dtm',
    type: 'timestamptz',
    nullable: true,
    default: () => 'NOW()',
  })
  connectDtm: Date;

  @Column({ name: 'error_content', type: 'text', nullable: true })
  errorContent: string;

  @Column({ name: 'method', type: 'varchar', length: 10, nullable: false })
  method: string;

  @Column({ name: 'request_body', type: 'text', nullable: true })
  requestBody: string;

  @Column(() => CreateAuditColumns)
  auditColumns: CreateAuditColumns;
}
