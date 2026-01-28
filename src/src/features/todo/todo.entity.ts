import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { AuditColumns } from '../../utils/auditColumns';

@Entity('nj_todo')
@Index('IX_NJ_TODO_USER_DATE', ['userSeq', 'todoDate'])
export class TodoEntity {
  constructor() {
    this.auditColumns = new AuditColumns();
  }

  @PrimaryGeneratedColumn({ name: 'todo_seq' })
  todoSeq: number;

  @Column({ name: 'user_seq', type: 'int', nullable: false })
  userSeq: number;

  @Column({ name: 'todo_content', type: 'text', nullable: true })
  todoContent: string | null;

  @Column({ name: 'todo_date', type: 'date', nullable: true })
  todoDate: string | null;

  @Column({
    name: 'complete_dtm',
    type: 'timestamptz',
    nullable: true,
  })
  completeDtm: Date | null;

  @Column({ name: 'todo_note', type: 'text', nullable: true })
  todoNote: string | null;

  @Column({ name: 'todo_file_group_no', type: 'int', nullable: true })
  todoFileGroupNo: number;

  @Column({ name: 'del_yn', type: 'char', length: 1, default: 'N' })
  delYn: string;

  @Column(() => AuditColumns)
  auditColumns: AuditColumns;
}
