import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tb_user')
export class UserEntity {
  // export default 아님
  @PrimaryGeneratedColumn({ name: 'user_seq' })
  userSeq: number;

  @Column({ name: 'user_id', unique: true })
  userId: string;

  @Column({ name: 'user_pw' })
  userPw: string;

  @Column({ name: 'user_name' })
  userName: string;

  @Column({ name: 'user_email' })
  userEmail: string;

  @Column({ name: 'user_auth_code', nullable: true })
  userAuthCode: string;

  @Column({ name: 'ai_api_key', nullable: true })
  aiApiKey: string;

  @Column({ name: 'refresh_token', nullable: true })
  refreshToken: string;

  @Column({ name: 'privacy_policy_consent', default: false })
  privacyPolicyConsent: boolean;

  @Column({ name: 'user_profile_image_file_group_no', nullable: true })
  userProfileImageFileGroupNo: number; // Cloudinary나 파일 그룹 ID

  @Column({ name: 'user_description', nullable: true, type: 'text' })
  userDescription: string;

  @CreateDateColumn({ name: 'reg_dtm' })
  regDtm: Date;

  @UpdateDateColumn({ name: 'mod_dtm' })
  modDtm: Date;
}
