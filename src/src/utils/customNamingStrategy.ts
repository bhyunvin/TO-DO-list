import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';
import { snakeCase } from 'typeorm/util/StringUtils';

export class CustomNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  // 복합 컬럼 이름에 부모 클래스 이름을 접두어로 사용하지 않음
  columnName(propertyName: string, customName: string): string {
    return customName || snakeCase(propertyName);
  }

  // 임베디드 엔티티의 부모 클래스 접두어 없이 컬럼 이름을 반환
  embeddedColumnName(
    _embeddedPrefixes: string[],
    columnPropertyName: string,
    columnCustomName: string,
  ): string {
    return columnCustomName || snakeCase(columnPropertyName);
  }
}
