import { Module } from '@nestjs/common';
import { KeychainUtil } from './keychainUtil';

@Module({
  providers: [KeychainUtil],
  exports: [KeychainUtil],
})
export class KeychainModule {}
