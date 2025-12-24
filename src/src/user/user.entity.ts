import { AuditColumns } from '../utils/auditColumns';
import { Entity, Column, PrimaryGeneratedColumn, AfterLoad } from 'typeorm';

@Entity('nj_user_info')
export class UserEntity {
  constructor() {
    this.auditColumns = new AuditColumns(); // auditColumns을 초기화
  }

  @PrimaryGeneratedColumn({ name: 'user_seq' })
  userSeq: number;

  @Column({ name: 'user_id', length: 40 })
  userId: string;

  @Column({ name: 'user_name', length: 200 })
  userName: string;

  @Column({ name: 'user_password', length: 500 })
  userPassword: string;

  @Column({ name: 'user_email', length: 100 })
  userEmail: string;

  @Column({ name: 'user_description', length: 4000 })
  userDescription: string;

  @Column({ name: 'user_profile_image_file_group_no' })
  userProfileImageFileGroupNo: number;

  @Column({ name: 'ai_api_key', type: 'text', nullable: true })
  aiApiKey: string;

  @Column({ name: 'admin_yn', length: 1 })
  adminYn: string;

  @Column(() => AuditColumns) // 복합 엔티티를 포함
  auditColumns: AuditColumns;

  // DB 컬럼이 아닌 응답용 가상 프로퍼티
  profileImage?: string;

  @AfterLoad()
  setProfileImage() {
    if (this.userProfileImageFileGroupNo) {
      this.profileImage = `/api/file/${this.userProfileImageFileGroupNo}`;
    }
  }
}
