import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

// exec 함수를 프로미스 기반으로 사용하기 위해 promisify로 감싸줍니다.
const execAsync = promisify(exec);

@Injectable()
export class KeychainUtil {
  private readonly logger = new Logger(KeychainUtil.name);

  /**
   * macOS 키체인에서 비밀번호를 조회합니다.
   * @param account 해당 서비스 내 계정 이름
   * @returns 조회된 비밀번호 또는 빈 문자열
   */
  async getPassword(account: string): Promise<string | null> {
    const sanitizedAccount = this.sanitizeInput(account);

    if (!sanitizedAccount) {
      this.logger.error('계정 이름에 허용되지 않는 문자가 포함되어 있습니다.');
      return null;
    }

    // `security` 명령어를 사용하여 키체인에서 비밀번호를 조회합니다.
    const command = `security find-generic-password -s "todo-list" -a "${sanitizedAccount}" -w`;

    try {
      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        // 'password not found' 오류는 정상이므로, 그 외의 오류만 로깅합니다.
        if (!stderr.includes('password not found')) {
          this.logger.error(`키체인 조회 중 오류 발생: ${stderr}`);
        }
        return null;
      }

      console.log('account', account, 'password', stdout.trim());

      // stdout의 마지막 개행 문자를 제거하고 반환합니다.
      return stdout.trim();
    } catch (error) {
      // 명령 실행 자체에 실패한 경우 (e.g., command not found)
      this.logger.error('security 명령어 실행에 실패했습니다.', error);
      return null;
    }
  }

  /**
   * 명령어 주입 공격을 방지하기 위한 입력값 검증 함수
   * @param input 검증할 문자열
   * @returns 검증을 통과한 문자열 또는 빈 문자열
   */
  private sanitizeInput(input: string): string {
    // 정규식을 사용하여 영문, 숫자, 하이픈(-), 언더스코어(_)만 허용
    const regex = /^[a-zA-Z0-9_-]+$/;
    if (regex.test(input)) {
      return input;
    }
    return '';
  }
}
