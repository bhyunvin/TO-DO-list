import { describe, it, expect } from 'bun:test';
import { setAuditColumn, AuditColumns } from './auditColumns';

describe('AuditColumns (감사 컬럼 유틸리티)', () => {
  it('새로운 엔티티에 감사 정보를 올바르게 설정해야 함', () => {
    const entity = { auditColumns: null as any };
    const id = 'user-1';
    const ip = '127.0.0.1';

    setAuditColumn({ entity, id, ip, isUpdate: false });

    expect(entity.auditColumns).toBeDefined();
    expect(entity.auditColumns.regId).toBe(id);
    expect(entity.auditColumns.regIp).toBe(ip);
    expect(entity.auditColumns.regDtm).toBeInstanceOf(Date);
    expect(entity.auditColumns.updId).toBe(id);
    expect(entity.auditColumns.updIp).toBe(ip);
    expect(entity.auditColumns.updDtm).toBeInstanceOf(Date);
  });

  it('업데이트 시 upd_* 컬럼만 변경해야 함', () => {
    const regDate = new Date('2023-01-01');
    const entity = {
      auditColumns: Object.assign(new AuditColumns(), {
        regId: 'creator',
        regIp: '1.1.1.1',
        regDtm: regDate,
        updId: 'creator',
        updIp: '1.1.1.1',
        updDtm: regDate,
      }),
    };
    const id = 'updater';
    const ip = '2.2.2.2';

    setAuditColumn({ entity, id, ip, isUpdate: true });

    expect(entity.auditColumns.regId).toBe('creator');
    expect(entity.auditColumns.regDtm).toEqual(regDate);
    expect(entity.auditColumns.updId).toBe(id);
    expect(entity.auditColumns.updIp).toBe(ip);
  });
});
