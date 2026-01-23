import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { AuditColumns } from '../../utils/auditColumns';

@Entity('nj_user_refresh_token')
export class RefreshTokenEntity {
  constructor() {
    this.auditColumns = new AuditColumns();
  }

  @PrimaryGeneratedColumn({ name: 'token_seq' })
  tokenSeq: number;

  @Column({ name: 'user_seq', type: 'int', nullable: false })
  userSeq: number;

  @Column({ name: 'refresh_token', type: 'text', nullable: false })
  refreshToken: string;

  @Column({ name: 'exp_dtm', type: 'timestamptz', nullable: false })
  expDtm: Date;

  @Column(() => AuditColumns)
  auditColumns: AuditColumns;
}
