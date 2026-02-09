import { Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export class CreateAuditColumns {
  @Column({ name: 'reg_id', type: 'varchar', length: 40, nullable: true })
  regId: string;

  @Column({ name: 'reg_ip', type: 'varchar', length: 40, nullable: true })
  regIp: string;

  @CreateDateColumn({ name: 'reg_dtm', type: 'timestamptz' })
  regDtm: Date;
}

export class AuditColumns extends CreateAuditColumns {
  @Column({ name: 'upd_id', type: 'varchar', length: 40, nullable: true })
  updId: string;

  @Column({ name: 'upd_ip', type: 'varchar', length: 40, nullable: true })
  updIp: string;

  @UpdateDateColumn({ name: 'upd_dtm', type: 'timestamptz' })
  updDtm: Date;
}

export interface AuditSettings<T = any> {
  entity: T;
  id: string;
  ip: string;
  isUpdate?: boolean;
}

export const setAuditColumn = <T extends { auditColumns: AuditColumns }>(
  setting: AuditSettings<T>,
): T => {
  const { entity, id, ip, isUpdate = false } = setting;

  if (!entity.auditColumns) {
    entity.auditColumns = new AuditColumns();
  }

  entity.auditColumns.updDtm = new Date();

  if (isUpdate) {
    // 업데이트 작업: upd_id와 upd_ip만 설정
    entity.auditColumns.updId = id;
    entity.auditColumns.updIp = ip;
  } else {
    // 생성 작업: reg_*와 upd_* 컬럼 모두 설정
    entity.auditColumns.regId = id;
    entity.auditColumns.regIp = ip;
    entity.auditColumns.regDtm = new Date();
    entity.auditColumns.updId = id;
    entity.auditColumns.updIp = ip;
  }

  return entity;
};
