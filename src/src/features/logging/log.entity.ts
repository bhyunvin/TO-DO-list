import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('nj_user_log')
export class LogEntity {
  @PrimaryGeneratedColumn({ name: 'seq' })
  seq: number;

  @Column({ name: 'user_id', nullable: true })
  userId: string; // 로그인하지 않은 경우 null 가능

  @Column({ name: 'client_ip', nullable: true })
  clientIp: string;

  @Column({ name: 'method', length: 10 })
  method: string;

  @Column({ name: 'url', type: 'text' })
  url: string;

  @Column({ name: 'status_code' })
  statusCode: number;

  @Column({ name: 'error_msg', type: 'text', nullable: true })
  errorMsg: string;

  @CreateDateColumn({ name: 'reg_dtm' })
  regDtm: Date;
}
