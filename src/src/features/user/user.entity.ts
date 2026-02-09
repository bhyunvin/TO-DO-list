import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { AuditColumns } from '../../utils/auditColumns';

@Entity('nj_user_info')
@Index('IX_NJ_USER_INFO_USER_ID', ['userId'], { unique: true })
@Index('IX_NJ_USER_INFO_USER_EMAIL', ['userEmail'], { unique: true })
export class UserEntity {
  constructor() {
    this.auditColumns = new AuditColumns();
  }

  @PrimaryGeneratedColumn({ name: 'user_seq' })
  userSeq: number;

  @Column({ name: 'user_id', type: 'varchar', length: 40, nullable: false })
  userId: string;

  @Column({ name: 'user_name', type: 'varchar', length: 40, nullable: false })
  userName: string;

  @Column({ name: 'user_password', type: 'text', nullable: true })
  userPw: string | null;

  @Column({ name: 'user_email', type: 'text', nullable: true })
  userEmail: string | null;

  @Column({ name: 'user_description', type: 'text', nullable: true })
  userDescription: string | null;

  @Column({
    name: 'user_profile_image_file_group_no',
    type: 'int',
    nullable: true,
  })
  userProfileImageFileGroupNo: number | null;

  @Column({ name: 'admin_yn', type: 'char', length: 1, default: 'N' })
  adminYn: string;

  @Column({ name: 'ai_api_key', type: 'text', nullable: true })
  aiApiKey: string | null;

  @Column({
    name: 'privacy_agreed_dtm',
    type: 'timestamptz',
    nullable: true,
  })
  privacyAgreedDtm: Date | null;

  @Column(() => AuditColumns)
  auditColumns: AuditColumns;

  // 프로필 이미지 URL (조회 시 동적으로 설정)
  profileImage?: string;
}
