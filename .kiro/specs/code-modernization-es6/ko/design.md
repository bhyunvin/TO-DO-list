# Design Document

## Overview

이 문서는 프론트엔드(React)와 백엔드(NestJS) 코드베이스를 ES6+ 문법으로 리팩토링하기 위한 설계를 정의합니다. 리팩토링은 세 가지 주요 영역에 초점을 맞춥니다:

1. **객체 속성 단축 문법 (Object Property Shorthand)**: 동일한 키-값 쌍을 단축 문법으로 변환하고 객체 최상단으로 재정렬
2. **주석 처리된 코드 제거**: 사용하지 않는 주석 처리된 코드 라인 삭제 (설명 주석은 보존)
3. **ES6+ 문법 현대화**: var → const/let, 화살표 함수, 템플릿 리터럴, 구조 분해, 메서드 축약 문법

## Architecture

### 리팩토링 접근 방식

리팩토링은 **점진적이고 안전한 방식**으로 진행됩니다:

1. **파일 단위 리팩토링**: 각 파일을 독립적으로 리팩토링하여 변경 범위를 제한
2. **기능 보존 우선**: 모든 변경은 기존 기능을 완전히 보존해야 함
3. **테스트 기반 검증**: 각 리팩토링 후 관련 테스트를 실행하여 기능 보존 확인
4. **진단 도구 활용**: getDiagnostics 도구를 사용하여 문법 오류 즉시 감지

### 리팩토링 범위

#### 포함되는 파일
- **프론트엔드**: `client/src/**/*.js` (React 컴포넌트, 훅, 스토어)
- **백엔드**: `src/src/**/*.ts` (NestJS 서비스, 컨트롤러, 엔티티, 유틸리티)

#### 제외되는 파일
- `node_modules/` 디렉토리
- `build/`, `dist/` 디렉토리
- 설정 파일 (package.json, tsconfig.json 등)
- 테스트 파일 (리팩토링은 하되 마지막에 처리)

## Components and Interfaces

### 1. Object Property Shorthand Refactoring

#### 패턴 식별
```javascript
// Before
const user = {
  name: name,
  email: email,
  age: 25,
  id: id
};

// After
const user = {
  name,
  email,
  id,
  age: 25
};
```

#### 구현 전략
1. 객체 리터럴에서 `key: value` 패턴 식별
2. `key`와 `value`가 동일한 식별자인지 확인
3. 단축 문법으로 변환: `key: key` → `key`
4. 모든 단축 속성을 객체 정의 최상단으로 이동
5. 나머지 속성은 원래 순서 유지

#### 적용 대상
- 함수 반환 객체
- 변수 선언 객체
- 함수 인자 객체
- API 요청/응답 객체

### 2. Commented Code Removal

#### 제거 대상
```javascript
// const oldVariable = 'test';  // ← 제거
// item.process();              // ← 제거
/* 
const unused = {
  data: 'old'
};
*/                              // ← 제거
```

#### 보존 대상
```javascript
// 사용자 데이터를 API에서 가져옵니다  // ← 보존
// Fetches user data from the API      // ← 보존
// TODO: 성능 최적화 필요                // ← 보존
```

#### 구현 전략
1. 주석 라인 스캔
2. 주석 내용이 코드인지 설명인지 판단
   - 코드 패턴: 변수 선언, 함수 호출, 연산자 포함
   - 설명 패턴: 자연어 문장, TODO/FIXME, 한글/영문 설명
3. 코드 주석만 제거
4. 설명 주석은 보존

### 3. ES6+ Syntax Modernization

#### 3.1 Variable Declarations (var → const/let)

```javascript
// Before
var count = 0;
var user = getUser();

// After
let count = 0;
const user = getUser();
```

**규칙**:
- 재할당되지 않는 변수: `const`
- 재할당되는 변수: `let`
- `var` 완전 제거

#### 3.2 Arrow Functions

```javascript
// Before
function handleClick(e) {
  console.log(e);
}

const callback = function(data) {
  return data.map(function(item) {
    return item.id;
  });
};

// After
const handleClick = (e) => {
  console.log(e);
};

const callback = (data) => {
  return data.map((item) => item.id);
};
```

**규칙**:
- 익명 함수 → 화살표 함수
- 콜백 함수 → 화살표 함수
- 단일 표현식 반환 → 암시적 반환 (선택적)
- `this` 바인딩이 필요한 경우 주의

#### 3.3 Template Literals

```javascript
// Before
const message = 'Hello, ' + name + '!';
const url = '/api/todo?date=' + formattedDate;

// After
const message = `Hello, ${name}!`;
const url = `/api/todo?date=${formattedDate}`;
```

**규칙**:
- 문자열 연결 (`+`) → 템플릿 리터럴
- 여러 줄 문자열 → 템플릿 리터럴
- 표현식 포함 문자열 → 템플릿 리터럴

#### 3.4 Destructuring

```javascript
// Before
const name = user.name;
const email = user.email;
const first = array[0];
const second = array[1];

// After
const { name, email } = user;
const [first, second] = array;
```

**규칙**:
- 객체 속성 추출 → 객체 구조 분해
- 배열 요소 추출 → 배열 구조 분해
- 함수 매개변수 → 구조 분해 매개변수

#### 3.5 Method Syntax

```javascript
// Before
const obj = {
  greet: function() {
    console.log('Hello');
  },
  calculate: function(a, b) {
    return a + b;
  }
};

// After
const obj = {
  greet() {
    console.log('Hello');
  },
  calculate(a, b) {
    return a + b;
  }
};
```

**규칙**:
- 객체 메서드의 `function` 키워드 제거
- 메서드 축약 문법 사용

## Data Models

### 리팩토링 메타데이터

각 파일의 리팩토링 진행 상황을 추적하기 위한 구조:

```typescript
interface RefactoringProgress {
  filePath: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  changes: {
    shorthandProperties: number;
    commentedCodeRemoved: number;
    varToConstLet: number;
    arrowFunctions: number;
    templateLiterals: number;
    destructuring: number;
    methodSyntax: number;
  };
  errors: string[];
  timestamp: Date;
}
```

## Error Handling

### 리팩토링 중 오류 처리

1. **문법 오류 감지**
   - 각 파일 리팩토링 후 `getDiagnostics` 실행
   - 오류 발견 시 변경 사항 검토 및 수정
   - 2회 시도 후 실패 시 사용자에게 보고

2. **기능 손상 방지**
   - 리팩토링 전 파일 백업 (Git 사용)
   - 변경 사항이 기능에 영향을 주지 않는지 확인
   - 테스트 실패 시 롤백 고려

3. **특수 케이스 처리**
   - `this` 바인딩이 필요한 함수는 화살표 함수로 변환하지 않음
   - 동적 속성 이름은 단축 문법 적용 불가
   - 주석 내 코드 예제는 제거하지 않음

## Testing Strategy

### 리팩토링 검증 프로세스

1. **파일 단위 검증**
   ```bash
   # 문법 오류 확인
   getDiagnostics([filePath])
   ```

2. **모듈 단위 테스트**
   ```bash
   # 프론트엔드 테스트
   npm test -- --testPathPattern=TodoList
   
   # 백엔드 테스트
   npm test -- --testPathPattern=user.service
   ```

3. **전체 테스트 스위트**
   ```bash
   # 프론트엔드 전체 테스트
   cd client && npm test -- --watchAll=false
   
   # 백엔드 전체 테스트
   cd src && npm test
   ```

### 테스트 실패 시 대응

- **1차 시도**: 리팩토링 코드 검토 및 수정
- **2차 시도**: 특정 변경 사항 롤백 후 재시도
- **실패 보고**: 사용자에게 실패 원인과 옵션 제시

## Implementation Phases

### Phase 1: 프론트엔드 핵심 파일
- `client/src/App.js`
- `client/src/authStore/authStore.js`
- `client/src/stores/chatStore.js`

### Phase 2: 프론트엔드 컴포넌트
- `client/src/components/*.js`
- `client/src/loginForm/*.js`

### Phase 3: 프론트엔드 TodoList
- `client/src/todoList/TodoList.js`
- `client/src/hooks/*.js`

### Phase 4: 백엔드 서비스
- `src/src/user/user.service.ts`
- `src/src/todo/todo.service.ts`
- `src/src/assistance/assistance.service.ts`

### Phase 5: 백엔드 컨트롤러 및 기타
- `src/src/user/user.controller.ts`
- `src/src/todo/todo.controller.ts`
- `src/src/utils/*.ts`

### Phase 6: 테스트 파일
- `client/src/**/*.test.js`
- `src/src/**/*.spec.ts`
- `src/test/**/*.e2e-spec.ts`

## Design Decisions and Rationales

### 1. 점진적 리팩토링
**결정**: 파일 단위로 순차적으로 리팩토링
**이유**: 
- 변경 범위를 제한하여 오류 추적 용이
- 각 단계에서 검증 가능
- 문제 발생 시 롤백 범위 최소화

### 2. 기능 보존 우선
**결정**: 모든 리팩토링은 기능을 완전히 보존해야 함
**이유**:
- 리팩토링의 목적은 코드 개선이지 기능 변경이 아님
- 사용자 경험에 영향을 주지 않음
- 테스트 통과를 통한 검증 가능

### 3. 단축 속성 재정렬
**결정**: 단축 속성을 객체 최상단으로 이동
**이유**:
- 일관된 코드 스타일
- 가독성 향상
- 속성 유형 구분 명확화

### 4. 화살표 함수 신중한 적용
**결정**: `this` 바인딩이 필요한 경우 화살표 함수 사용 안 함
**이유**:
- 화살표 함수는 자체 `this`를 가지지 않음
- React 클래스 컴포넌트 메서드는 주의 필요
- 기능 손상 방지

### 5. 주석 보존 정책
**결정**: 설명 주석은 보존, 코드 주석만 제거
**이유**:
- 코드 이해를 돕는 주석은 가치 있음
- 한글 주석은 프로젝트 표준
- TODO/FIXME는 향후 작업 추적에 필요

## Risk Mitigation

### 잠재적 위험 및 완화 전략

1. **`this` 바인딩 문제**
   - **위험**: 화살표 함수로 변환 시 `this` 컨텍스트 손실
   - **완화**: React 클래스 컴포넌트 메서드는 변환하지 않음

2. **템플릿 리터럴 이스케이프**
   - **위험**: 백틱 내 특수 문자 처리 오류
   - **완화**: 이스케이프가 필요한 문자 확인 및 처리

3. **구조 분해 부작용**
   - **위험**: 중첩 객체 구조 분해 시 undefined 오류
   - **완화**: 안전한 경우에만 적용, 기본값 설정 고려

4. **테스트 실패**
   - **위험**: 리팩토링으로 인한 예상치 못한 테스트 실패
   - **완화**: 각 단계에서 테스트 실행, 실패 시 롤백

5. **대규모 파일 처리**
   - **위험**: 큰 파일 리팩토링 시 실수 가능성 증가
   - **완화**: 파일을 논리적 섹션으로 나누어 처리

## Performance Considerations

리팩토링 자체는 런타임 성능에 큰 영향을 주지 않지만, 다음 사항을 고려합니다:

1. **화살표 함수**: 일반 함수와 성능 차이 미미
2. **템플릿 리터럴**: 문자열 연결과 성능 유사
3. **구조 분해**: 약간의 오버헤드 있으나 무시할 수준
4. **단축 속성**: 성능 영향 없음

## Accessibility and Security

### 접근성
- 리팩토링은 UI/UX에 영향을 주지 않으므로 접근성 유지

### 보안
- 코드 구조 변경만 수행하므로 보안 영향 없음
- 입력 검증, 인증 로직은 변경하지 않음

## Future Enhancements

리팩토링 완료 후 고려할 추가 개선 사항:

1. **Optional Chaining**: `obj?.prop?.nested`
2. **Nullish Coalescing**: `value ?? defaultValue`
3. **Async/Await 확장**: Promise 체인을 async/await로 변환
4. **Spread Operator 확장**: 객체/배열 복사 및 병합
5. **ESLint 규칙 추가**: 자동 포맷팅 및 스타일 강제
