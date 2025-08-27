import { AuditColumns } from '../utils/auditColumns';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('nj_todo')
export class TodoEntity {
  constructor() {
    this.auditColumns = new AuditColumns(); // auditColumns을 초기화
  }

  @PrimaryGeneratedColumn({ name: 'todo_seq' })
  todoSeq: number;

  @Column({ name: 'user_seq', type: 'int' })
  userSeq: number;

  @Column({
    name: 'todo_content',
    type: 'varchar',
    length: 4000,
    nullable: true,
  })
  todoContent: string;

  @Column({ name: 'todo_date', type: 'date', nullable: true })
  todoDate: string;

  @Column({ name: 'complete_dtm', type: 'timestamp', nullable: true })
  completeDtm: string;

  @Column({ name: 'todo_note', type: 'varchar', length: 4000, nullable: true })
  todoNote: string;

  @Column({ name: 'todo_file_group_no', type: 'int', nullable: true })
  todoFileGroupNo: number;

  @Column({ name: 'del_yn', type: 'char', length: 1, default: 'N' })
  delYn: string;

  @Column(() => AuditColumns) // 복합 엔티티를 포함
  auditColumns: AuditColumns;
}
