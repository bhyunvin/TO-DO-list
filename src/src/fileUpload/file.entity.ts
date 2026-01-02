import { AuditColumns } from '../utils/auditColumns';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('nj_file_info')
export class FileInfoEntity {
  constructor() {
    this.auditColumns = new AuditColumns(); // auditColumns을 초기화
  }

  @PrimaryGeneratedColumn({ name: 'file_no' })
  fileNo: number;

  @Column({ name: 'file_group_no', type: 'int' })
  fileGroupNo: number;

  @Column({ name: 'file_path', type: 'text' })
  filePath: string;

  @Column({ name: 'save_file_nm', type: 'text' })
  saveFileName: string;

  @Column({ name: 'file_ext', type: 'varchar', length: 10 })
  fileExt: string;

  @Column({ name: 'file_size', type: 'int' })
  fileSize: number;

  @Column({ name: 'public_id', type: 'varchar', length: 255, nullable: true })
  publicId: string;

  @Column({
    name: 'resource_type',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  resourceType: string;

  @Column(() => AuditColumns) // 복합 엔티티를 포함
  auditColumns: AuditColumns;
}
