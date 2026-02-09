import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

// TypeORM 내부 StringUtils API는 public API가 아니므로 직접 구현
// (Bun 런타임에서 'typeorm/util/StringUtils' import 불가 문제 해결)
function snakeCase(str: string): string {
  return str
    .replaceAll(/([a-z])([A-Z])/g, '$1_$2') // 카멜케이스(camelCase) 경계 처리
    .replaceAll(/([A-Z])([A-Z][a-z])/g, '$1_$2') // 변환 예시: XMLParser → XML_Parser
    .toLowerCase();
}

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
