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

export function setAuditColumn(setting: AuditSettings) {
  const { entity, id, ip, isUpdate = false } = setting;

  entity.auditColumns.regId = id;
  entity.auditColumns.regIp = ip;
  entity.auditColumns.updId = id;

  if (isUpdate) {
    entity.auditColumns.updIp = ip;
  }

  return entity;
}
