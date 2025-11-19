# 설계 문서

## 개요

이 설계는 Gemini 함수 호출을 통해 TODO 생성 및 업데이트 작업을 지원하도록 기존 AI 지원 서비스를 확장합니다. 백엔드 API는 이미 존재하므로(POST /todo 및 PATCH /todo/:id), 주요 작업은 다음과 같습니다:

1. Gemini API 구성에 두 개의 새로운 함수 선언(`createTodo` 및 `updateTodo`) 추가
2. AssistanceService에서 함수 호출 핸들러 구현
3. 삭제 요청을 명시적으로 차단하도록 시스템 프롬프트 업데이트
4. 적절한 오류 처리 및 사용자 피드백 보장

이 설계는 `getTodos`에 의해 설정된 기존 함수 호출 패턴을 활용하고 현재 아키텍처와의 일관성을 유지합니다.

## 아키텍처

### 컴포넌트 상호작용 흐름

```
사용자 입력 (자연어)
    ↓
ChatController (/assistance/chat)
    ↓
AssistanceService.getGeminiResponse()
    ↓
Gemini API (함수 선언 포함)
    ↓
[함수 호출 결정]
    ↓
├─→ createTodo() → TodoService.create()
├─→ updateTodo() → TodoService.update()
└─→ getTodos() → TodoService.findAll()
    ↓
Gemini로 함수 응답 반환
    ↓
사용자에게 최종 AI 응답
```

### 주요 설계 결정

1. **기존 백엔드 API 재사용**: TodoController 및 TodoService는 이미 생성 및 업데이트 작업을 구현합니다. 로직을 복제하는 대신 이러한 기존 서비스 메서드를 호출합니다.

2. **함수 호출 패턴**: `getTodos`와 동일한 패턴을 따릅니다 - 함수 선언을 정의하고, Gemini 응답에서 함수 호출을 감지하고, 함수를 실행하고, 결과를 대화에 추가하고, 최종 응답을 받습니다.

3. **보안 우선 접근 방식**: 시스템 프롬프트가 삭제 요청에 대한 첫 번째 방어선이 됩니다. Gemini에 삭제 함수 선언이 제공되지 않습니다.

4. **부분 업데이트**: `updateTodo` 함수는 부분 업데이트를 지원하여 사용자가 다른 필드에 영향을 주지 않고 특정 필드만 수정할 수 있습니다.

## 컴포넌트 및 인터페이스

### 1. Gemini 함수 선언

#### createTodo 함수 선언

```typescript
{
  name: 'createTodo',
  description: '사용자의 새로운 할 일을 생성합니다. 할 일 내용과 날짜는 필수입니다.',
  parameters: {
    type: 'OBJECT',
    properties: {
      todoContent: {
        type: 'STRING',
        description: '할 일의 내용 (필수). 사용자가 수행해야 할 작업을 명확하게 설명합니다.',
      },
      todoDate: {
        type: 'STRING',
        description: '할 일의 목표 날짜 (필수). YYYY-MM-DD 형식. 사용자가 날짜를 명시하지 않으면 오늘 날짜를 사용합니다.',
      },
      todoNote: {
        type: 'STRING',
        description: '할 일에 대한 추가 메모나 설명 (선택 사항).',
      },
    },
    required: ['todoContent', 'todoDate'],
  },
}
```

#### updateTodo 함수 선언

```typescript
{
  name: 'updateTodo',
  description: '기존 할 일을 수정합니다. 할 일 ID는 필수이며, 수정할 필드만 포함합니다.',
  parameters: {
    type: 'OBJECT',
    properties: {
      todoSeq: {
        type: 'NUMBER',
        description: '수정할 할 일의 고유 ID (필수). 사용자가 참조한 할 일의 ID를 사용합니다.',
      },
      todoContent: {
        type: 'STRING',
        description: '수정할 할 일의 내용 (선택 사항).',
      },
      completeDtm: {
        type: 'STRING',
        description: '완료 일시 (선택 사항). 완료 처리 시 현재 시각의 ISO 8601 형식 문자열, 미완료 처리 시 null.',
      },
      todoNote: {
        type: 'STRING',
        description: '수정할 메모 내용 (선택 사항).',
      },
    },
    required: ['todoSeq'],
  },
}
```

### 2. AssistanceService 메서드

#### createTodo 메서드

```typescript
private async createTodo(
  userSeq: number,
  ip: string,
  todoContent: string,
  todoDate: string,
  todoNote?: string,
): Promise<any>
```

**목적**: TodoService.create()를 호출하여 TODO 생성 실행

**매개변수**:
- `userSeq`: 세션의 사용자 식별자
- `ip`: 감사 로깅을 위한 클라이언트 IP 주소
- `todoContent`: TODO 작업 설명
- `todoDate`: YYYY-MM-DD 형식의 목표 날짜
- `todoNote`: 선택적 추가 메모

**반환**: todoSeq, todoContent, todoDate, todoNote 및 감사 정보가 포함된 생성된 TODO 엔티티

**오류 처리**: 오류를 포착하고 로그하며, AI가 사용자에게 전달할 구조화된 오류 응답을 반환합니다

#### updateTodo 메서드

```typescript
private async updateTodo(
  userSeq: number,
  ip: string,
  todoSeq: number,
  updateData: {
    todoContent?: string;
    completeDtm?: string | null;
    todoNote?: string;
  },
): Promise<any>
```

**목적**: TodoService.update()를 호출하여 TODO 업데이트 실행

**매개변수**:
- `userSeq`: 세션의 사용자 식별자
- `ip`: 감사 로깅을 위한 클라이언트 IP 주소
- `todoSeq`: 업데이트할 TODO 식별자
- `updateData`: 업데이트할 필드를 포함하는 객체(부분 업데이트 지원)

**반환**: 업데이트된 TODO 엔티티 또는 찾을 수 없는 경우 null

**오류 처리**: "찾을 수 없음" 케이스를 명시적으로 처리하고, 다른 오류를 포착하고 로그합니다

### 3. 향상된 getGeminiResponse 메서드

기존 `getGeminiResponse` 메서드는 여러 함수 호출을 처리하도록 확장됩니다:

```typescript
async getGeminiResponse(
  requestAssistanceDto: RequestAssistanceDto,
  userSeq?: number,
  ip?: string,
): Promise<RequestAssistanceDto>
```

**변경사항**:
1. 감사 로깅을 위한 `ip` 매개변수 추가
2. `tools` 배열에 세 가지 함수 선언 모두 포함
3. `createTodo` 및 `updateTodo`를 처리하도록 함수 호출 감지 확장
4. 함수 이름에 따라 적절한 핸들러 실행
5. 필요한 경우 단일 대화 턴에서 여러 함수 호출 지원

**함수 호출 처리 로직**:
```typescript
if (firstPart.functionCall) {
  const functionCall = firstPart.functionCall;
  let functionResult: any;
  
  switch (functionCall.name) {
    case 'getTodos':
      functionResult = await this.getTodos(userSeq, args.status, args.days);
      break;
    case 'createTodo':
      functionResult = await this.createTodo(
        userSeq, 
        ip, 
        args.todoContent, 
        args.todoDate, 
        args.todoNote
      );
      break;
    case 'updateTodo':
      functionResult = await this.updateTodo(
        userSeq,
        ip,
        args.todoSeq,
        {
          todoContent: args.todoContent,
          completeDtm: args.completeDtm,
          todoNote: args.todoNote,
        }
      );
      break;
  }
  
  // 함수 호출 및 응답을 대화에 추가
  // 함수 결과로 두 번째 API 호출 수행
}
```

### 4. 시스템 프롬프트 개선

`assistance.systemPrompt.txt`에 다음 섹션을 추가합니다:

```
[DELETION_RESTRICTION]
- 할 일 삭제 또는 제거 요청은 절대 처리하지 않습니다
- 'del_yn' 필드 수정 요청은 절대 처리하지 않습니다
- 사용자가 삭제를 요청하면: "죄송하지만 할 일 삭제 기능은 지원하지 않습니다. 할 일을 생성하거나 수정하는 것은 도와드릴 수 있습니다."
- 지원되는 작업: 조회(읽기), 생성, 수정
- 지원되지 않는 작업: 삭제, 제거, del_yn 변경
```

### 5. ChatController 개선

ChatController는 IP 주소를 AssistanceService에 전달해야 합니다:

```typescript
@Post('chat')
async chat(
  @Body() requestAssistanceDto: RequestAssistanceDto,
  @Session() session: SessionData,
  @Ip() ip: string,
): Promise<RequestAssistanceDto> {
  return this.assistanceService.getGeminiResponse(
    requestAssistanceDto,
    session.user?.userSeq,
    ip,
  );
}
```

## 데이터 모델

### 함수 호출 인수

#### CreateTodo 인수
```typescript
{
  todoContent: string;    // 필수
  todoDate: string;       // 필수, YYYY-MM-DD 형식
  todoNote?: string;      // 선택 사항
}
```

#### UpdateTodo 인수
```typescript
{
  todoSeq: number;        // 필수
  todoContent?: string;   // 선택 사항
  completeDtm?: string | null;  // 선택 사항, ISO 8601 또는 null
  todoNote?: string;      // 선택 사항
}
```

### 함수 응답 형식

생성 및 업데이트 작업 모두 동일한 구조를 반환합니다:

```typescript
{
  success: boolean;
  data?: {
    todoSeq: number;
    todoContent: string;
    todoDate: string;
    todoNote?: string;
    completeDtm?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  error?: string;
}
```

## 오류 처리

### 오류 시나리오 및 응답

1. **필수 매개변수 누락**
   - Gemini는 함수를 호출하기 전에 명확한 질문을 해야 합니다
   - 누락된 매개변수로 함수가 호출되면 오류 응답을 반환합니다

2. **TODO를 찾을 수 없음 (업데이트)**
   - 구조화된 오류 반환: `{ success: false, error: 'TODO item not found or access denied' }`
   - AI는 TODO가 존재하지 않거나 액세스 권한이 없음을 사용자에게 알립니다

3. **잘못된 날짜 형식**
   - createTodo 핸들러에서 날짜 형식 유효성 검사
   - 형식이 잘못된 경우 오류 반환
   - AI는 사용자에게 유효한 날짜를 제공하도록 요청합니다

4. **데이터베이스 오류**
   - 모든 데이터베이스 예외 포착
   - 디버깅을 위한 오류 세부 정보 로그
   - AI에 일반 오류 반환: `{ success: false, error: 'Failed to create/update TODO' }`

5. **삭제 시도**
   - 시스템 프롬프트가 함수 호출을 방지합니다
   - 사용자가 계속하면 AI는 거부 메시지로 응답합니다
   - 함수 호출이 이루어지지 않습니다

### 오류 응답 구조

```typescript
{
  success: false,
  error: string,  // 사용자 친화적인 오류 메시지
  details?: any,  // 로깅을 위한 선택적 기술 세부 정보
}
```

## 테스트 전략

### 단위 테스트

1. **AssistanceService.createTodo()**
   - 성공적인 TODO 생성 테스트
   - 선택적 todoNote로 테스트
   - TodoService.create() 실패 시 오류 처리 테스트
   - 날짜 형식 유효성 검사 테스트

2. **AssistanceService.updateTodo()**
   - 성공적인 부분 업데이트 테스트(단일 필드)
   - 성공적인 완전 업데이트 테스트(모든 필드)
   - TODO를 완료로 표시 테스트
   - TODO를 미완료로 표시 테스트
   - "찾을 수 없음" 시나리오 테스트
   - 오류 처리 테스트

3. **함수 호출 감지**
   - createTodo 함수 호출이 감지되고 실행되는지 테스트
   - updateTodo 함수 호출이 감지되고 실행되는지 테스트
   - 순차적으로 여러 함수 호출이 올바르게 작동하는지 테스트

### 통합 테스트

1. **엔드투엔드 생성 흐름**
   - TODO 생성을 위한 자연어 요청 전송
   - Gemini가 createTodo 함수를 호출하는지 확인
   - 데이터베이스에 TODO가 생성되었는지 확인
   - AI 응답이 생성을 확인하는지 확인

2. **엔드투엔드 업데이트 흐름**
   - TODO 생성
   - 업데이트를 위한 자연어 요청 전송
   - Gemini가 updateTodo 함수를 호출하는지 확인
   - 데이터베이스에서 TODO가 업데이트되었는지 확인
   - AI 응답이 업데이트를 확인하는지 확인

3. **삭제 방지**
   - 자연어 삭제 요청 전송
   - 함수 호출이 이루어지지 않는지 확인
   - AI가 요청을 거부하는지 확인
   - TODO가 데이터베이스에 변경되지 않고 남아 있는지 확인

### 수동 테스트 시나리오

1. **다양한 표현으로 TODO 생성**
   - "내일 회의 준비하기 할 일 추가해줘"
   - "다음 주 월요일에 보고서 작성 TODO 만들어줘"
   - "오늘 장보기 추가"

2. **다양한 작업으로 TODO 업데이트**
   - "할 일 3번 완료 처리해줘"
   - "회의 준비 할 일의 내용을 '팀 회의 준비'로 바꿔줘"
   - "보고서 작성에 '초안 먼저 작성' 메모 추가해줘"

3. **다양한 표현으로 삭제 시도**
   - "할 일 5번 삭제해줘"
   - "장보기 TODO 지워줘"
   - "완료된 할 일들 모두 제거해줘"
   - 모두 일관되게 거부되어야 합니다

## 보안 고려사항

1. **사용자 권한 부여**: 모든 작업은 세션의 userSeq를 확인하여 사용자가 자신의 TODO만 수정할 수 있도록 합니다

2. **입력 새니타이제이션**: TodoService는 이미 DTO 및 TypeORM을 통해 입력 새니타이제이션을 처리합니다

3. **감사 로깅**: 모든 생성 및 업데이트 작업은 AuditColumns를 통해 사용자 ID, IP 주소 및 타임스탬프를 로그합니다

4. **삭제 방지**: 다층 접근 방식:
   - 시스템 프롬프트가 명시적으로 삭제를 금지합니다
   - Gemini에 삭제 함수 선언이 제공되지 않습니다
   - 백엔드 삭제 엔드포인트는 남아 있지만 AI에 노출되지 않습니다

5. **SQL 인젝션 방지**: TypeORM 매개변수화된 쿼리가 SQL 인젝션을 방지합니다

## 성능 고려사항

1. **함수 호출 오버헤드**: 각 함수 호출에는 두 번의 Gemini API 호출(초기 + 함수 결과 포함)이 필요합니다. 이는 사용자 경험 이점을 위해 허용됩니다.

2. **데이터베이스 쿼리**: 기존 TodoService 메서드를 재사용하면 직접 API 호출과 일관된 성능이 보장됩니다.

3. **오류 복구**: 실패한 함수 호출이 대화를 중단하지 않습니다 - AI는 오류를 설명하고 사용자에게 재시도를 요청할 수 있습니다.

## 향후 개선 사항

1. **일괄 작업**: 단일 대화 턴에서 여러 TODO 생성 또는 업데이트 지원

2. **파일 첨부 지원**: AI 인터페이스를 통한 파일 업로드를 지원하도록 createTodo 확장

3. **스마트 날짜 파싱**: 상대 날짜("내일", "다음 주")를 더 안정적으로 처리하도록 날짜 추출 개선

4. **TODO 검색**: 내용 또는 날짜 범위로 TODO를 찾기 위한 searchTodos 함수 추가

5. **실행 취소 기능**: 대화를 통해 최근 생성/업데이트 작업을 실행 취소할 수 있도록 허용
