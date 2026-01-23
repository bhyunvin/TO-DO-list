import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tb_todo')
export class TodoEntity {
  @PrimaryGeneratedColumn({ name: 'todo_seq' })
  todoSeq: number;

  @Column({ name: 'user_seq' })
  userSeq: number;

  @Column({ name: 'todo_content' })
  todoContent: string;

  @Column({ name: 'todo_date', type: 'date' }) // YYYY-MM-DD
  todoDate: string;

  @Column({ name: 'todo_note', type: 'text', nullable: true })
  todoNote: string;

  @Column({ name: 'complete_dtm', nullable: true }) // 완료 시 타임스탬프
  completeDtm: string; // 혹은 Date

  @Column({ name: 'del_yn', default: 'N', length: 1 })
  delYn: string;

  @Column({ name: 'todo_file_group_no', nullable: true })
  todoFileGroupNo: number;

  @CreateDateColumn({ name: 'reg_dtm' })
  regDtm: Date;

  @UpdateDateColumn({ name: 'mod_dtm' })
  modDtm: Date;
}
