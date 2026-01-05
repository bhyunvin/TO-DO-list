import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserEntity } from '../../user/user.entity';
import { RefreshTokenEntity } from '../../user/refresh-token.entity';
import { encrypt, isHashValid } from '../../utils/cryptUtil';
import { setAuditColumn } from '../../utils/auditColumns';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async login(user: Partial<UserEntity>, ip: string) {
    const payload = { userSeq: user.userSeq, userId: user.userId };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.generateRefreshToken();

    await this.saveRefreshToken(user.userSeq, refreshToken, user.userId, ip);

    return {
      access_token: accessToken,
      refreshToken,
      user,
    };
  }

  async rotateRefreshToken(refreshToken: string, userSeq: number, ip: string) {
    const tokens = await this.refreshTokenRepository.find({
      where: { userSeq },
    });

    let matchedTokenEntity: RefreshTokenEntity | null = null;

    for (const tokenEntity of tokens) {
      const isMatch = await isHashValid(refreshToken, tokenEntity.refreshToken);
      if (isMatch) {
        matchedTokenEntity = tokenEntity;
        break;
      }
    }

    if (!matchedTokenEntity) {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }

    // 만료 검사
    if (matchedTokenEntity.expDtm < new Date()) {
      await this.refreshTokenRepository.remove(matchedTokenEntity);
      throw new UnauthorizedException('리프레시 토큰이 만료되었습니다.');
    }

    // 로테이션: 기존 토큰 삭제 후 새 토큰 생성
    return this.dataSource.transaction(async (manager) => {
      await manager.remove(RefreshTokenEntity, matchedTokenEntity);

      const newAccessToken = this.jwtService.sign({
        userSeq,
        userId: matchedTokenEntity.auditColumns.regId, // reg_id에서 userId를 가져옵니다.
      });
      const newRefreshToken = this.generateRefreshToken();

      const hashedRefreshToken = await encrypt(newRefreshToken);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      let newEntity = new RefreshTokenEntity();
      newEntity.userSeq = userSeq;
      newEntity.refreshToken = hashedRefreshToken;
      newEntity.expDtm = expiryDate;

      // 감사 컬럼 설정 (기존 IP와 ID 등 정보 유지)
      // 로테이션은 시스템에 의한 갱신 혹은 사용자에 의한 갱신으로 볼 수 있음.
      // 여기서는 기존 등록 정보를 기반으로 새로 생성하되, 로테이션 요청을 보낸 현재 IP(ip)를 사용합니다.

      newEntity = setAuditColumn({
        entity: newEntity,
        id: matchedTokenEntity.auditColumns.regId || 'system',
        ip: ip, // 현재 요청 IP 사용
      });
      // regDtm 등은 setAuditColumn 내부에서 처리됨 (새 엔티티이므로)

      await manager.save(RefreshTokenEntity, newEntity);

      return {
        access_token: newAccessToken,
        refreshToken: newRefreshToken,
      };
    });
  }

  async logout(userSeq: number, refreshToken?: string) {
    if (refreshToken) {
      // 특정 토큰만 삭제 (찾아서 삭제)
      const tokens = await this.refreshTokenRepository.find({
        where: { userSeq },
      });
      for (const token of tokens) {
        if (await isHashValid(refreshToken, token.refreshToken)) {
          await this.refreshTokenRepository.remove(token);
          return;
        }
      }
    }
  }

  private generateRefreshToken(): string {
    // 랜덤 문자열 생성
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  private async saveRefreshToken(
    userSeq: number,
    refreshToken: string,
    userId: string | undefined,
    ip: string,
  ) {
    const hashedRefreshToken = await encrypt(refreshToken);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    let entity = new RefreshTokenEntity();
    entity.userSeq = userSeq;
    entity.refreshToken = hashedRefreshToken;
    entity.expDtm = expiryDate;

    // 감사 컬럼 설정
    entity = setAuditColumn({
      entity,
      ip,
      id: userId,
    });

    await this.refreshTokenRepository.save(entity);
  }

  decodeAccessToken(accessToken: string): any {
    return this.jwtService.decode(accessToken);
  }
}
