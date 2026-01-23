import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('tb_refresh_token')
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'token', length: 500 })
  refreshToken: string;

  @Column({ name: 'user_seq' })
  userSeq: number;

  @Column({ name: 'exp_dtm' })
  expDtm: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
