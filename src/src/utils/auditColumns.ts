import { Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export class AuditColumns {
  @Column({ name: 'reg_id', length: 40, nullable: true })
  regId: string;

  @Column({ name: 'reg_ip', length: 40 })
  regIp: string;

  @CreateDateColumn({ name: 'reg_dtm', type: 'timestamp' })
  regDtm: Date;

  @Column({ name: 'upd_id', length: 40, nullable: true })
  updId: string;

  @Column({ name: 'upd_ip', length: 40, nullable: true })
  updIp: string;

  @UpdateDateColumn({ name: 'upd_dtm', type: 'timestamp' })
  updDtm: Date;
}

export interface AuditSettings {
  entity: any;
  id: string;
  ip: string;
  isUpdate?: boolean;
}

export const setAuditColumn = (setting: AuditSettings) => {
  const { entity, id, ip, isUpdate = false } = setting;

  if (isUpdate) {
    // 업데이트 작업: upd_id와 upd_ip만 설정
    entity.auditColumns.updId = id;
    entity.auditColumns.updIp = ip;
  } else {
    // 생성 작업: reg_*와 upd_* 컬럼 모두 설정
    entity.auditColumns.regId = id;
    entity.auditColumns.regIp = ip;
    entity.auditColumns.updId = id;
    entity.auditColumns.updIp = ip;
  }

  return entity;
};
