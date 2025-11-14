# 요구사항 문서

## 소개

이 명세서는 기존 AI 어시스턴트 채팅 인터페이스의 보안, 사용자 경험 및 AI 지능을 개선하기 위한 향상 사항을 정의합니다. 이 향상 사항은 네 가지 중요한 영역을 다룹니다: 정확한 시간 추론을 위한 날짜 인식, 자연스러운 상호작용을 위한 콘텐츠 기반 작업 업데이트, 개선된 UX를 위한 사전 목록 새로고침, 그리고 필수 세션 기반 보안 강화입니다.

## 용어집

- **AI_Assistant_Service**: Google Gemini API와의 통신을 처리하는 백엔드 NestJS 서비스
- **System_Prompt**: AI 동작 및 기능을 정의하는 지시 텍스트
- **Function_Calling**: AI가 사전 정의된 함수를 호출할 수 있게 하는 Gemini API 기능
- **Todo_Service**: 할 일 데이터 접근 메서드를 제공하는 백엔드 서비스
- **User_Session**: userSeq 및 사용자 정보를 포함하는 인증된 세션
- **KST**: 한국 표준시 (UTC+9)
- **Content_Based_Update**: ID 대신 제목/내용으로 할 일을 식별하는 것
- **Proactive_Refresh**: 쓰기 작업 후 자동으로 업데이트된 데이터를 표시하는 것

## 요구사항

### 요구사항 1: 날짜 인식 AI 컨텍스트

**사용자 스토리:** 사용자로서, AI가 "오늘", "내일" 또는 "11월 14일"과 같은 모호한 날짜를 올바르게 해석하여 정확한 연도와 날짜로 할 일을 생성하고 조회할 수 있기를 원합니다.

#### 인수 기준

1. WHEN AI_Assistant_Service가 사용자 요청을 처리할 때, THE System SHALL KST 시간대의 현재 서버 날짜를 YYYY-MM-DD 형식으로 제공한다
2. THE System_Prompt SHALL Gemini API에 대한 모든 요청에 현재 날짜 컨텍스트를 포함한다
3. WHEN 사용자가 연도 없이 모호한 날짜를 제공할 때, THE AI_Assistant_Service SHALL 현재 날짜 컨텍스트를 기반으로 올바른 전체 날짜로 해석한다
4. THE AI_Assistant_Service SHALL 날짜 계산을 위해 서버의 시스템 시간을 KST로 변환하여 사용한다
5. WHEN "오늘" 또는 "내일"과 같은 상대적 날짜로 할 일을 생성하거나 조회할 때, THE AI_Assistant_Service SHALL 현재 날짜를 기반으로 YYYY-MM-DD 값을 올바르게 계산한다

### 요구사항 2: 콘텐츠 기반 할 일 업데이트

**사용자 스토리:** 사용자로서, 할 일 ID를 알거나 지정할 필요 없이 제목이나 내용을 참조하여 (예: "'우유 사기' 작업 업데이트") 할 일을 업데이트할 수 있기를 원합니다.

#### 인수 기준

1. WHEN 사용자가 내용으로 할 일 업데이트를 요청할 때, THE AI_Assistant_Service SHALL 제공된 내용 텍스트를 사용하여 일치하는 할 일을 검색한다
2. IF 정확히 하나의 할 일이 내용과 일치하면, THE AI_Assistant_Service SHALL 해당 할 일의 todoSeq를 사용하여 업데이트 작업을 진행한다
3. IF 여러 할 일이 내용과 일치하면, THE AI_Assistant_Service SHALL 추가 컨텍스트(날짜 또는 기타 세부 정보)를 제공하여 명확히 하도록 사용자에게 요청한다
4. IF 내용과 일치하는 할 일이 없으면, THE AI_Assistant_Service SHALL 일치하는 할 일을 찾을 수 없다고 사용자에게 알린다
5. THE updateTodo 함수 SHALL todoSeq 기반 업데이트(기존)와 콘텐츠 기반 업데이트(신규)를 모두 지원한다
6. WHEN 완료 상태를 업데이트할 때, THE updateTodo 함수 SHALL completeDtm 타임스탬프 대신 isCompleted boolean 매개변수를 받는다
7. WHEN isCompleted가 true일 때, THE System SHALL completeDtm을 현재 서버 타임스탬프로 설정한다
8. WHEN isCompleted가 false일 때, THE System SHALL completeDtm을 NULL로 설정한다
9. WHEN isCompleted가 제공되지 않을 때, THE System SHALL completeDtm 값을 수정하지 않는다

### 요구사항 3: 쓰기 작업 후 사전 목록 새로고침

**사용자 스토리:** 사용자로서, 작업을 생성하거나 수정한 후 자동으로 업데이트된 할 일 목록을 볼 수 있기를 원하므로, 변경 사항을 보기 위해 두 번째 요청을 할 필요가 없습니다.

#### 인수 기준

1. WHEN createTodo 작업이 성공하면, THE AI_Assistant_Service SHALL 관련 날짜 범위에 대한 업데이트된 할 일 목록을 자동으로 가져와 표시한다
2. WHEN updateTodo 작업이 성공하면, THE AI_Assistant_Service SHALL 관련 날짜 범위에 대한 업데이트된 할 일 목록을 자동으로 가져와 표시한다
3. THE System_Prompt SHALL 새로고침된 할 일 목록을 표시하기 위해 FORMATTING_RULES를 사용하도록 AI에게 지시한다
4. THE AI_Assistant_Service SHALL 응답에 성공 확인 메시지와 형식화된 할 일 목록을 모두 포함한다
5. THE 새로고침된 할 일 목록 SHALL 작업과 관련된 할 일을 표시한다 (예: "오늘" 생성된 작업의 경우 오늘 목록)

### 요구사항 4: 필수 세션 기반 보안

**사용자 스토리:** 시스템 관리자로서, 모든 할 일 작업이 인증된 사용자의 세션으로 안전하게 범위가 지정되어 사용자가 다른 사용자의 데이터에 접근하거나 수정할 수 없기를 원합니다.

#### 인수 기준

1. THE AI_Assistant_Service SHALL 모든 요청에 대해 인증된 사용자 세션에서 userSeq를 받는다
2. THE getTodos 함수 SHALL 세션 userSeq를 내부적으로 사용하며 userSeq를 AI가 제어할 수 있는 매개변수로 받지 않는다
3. THE createTodo 함수 SHALL 세션 userSeq를 내부적으로 사용하며 userSeq를 AI가 제어할 수 있는 매개변수로 받지 않는다
4. THE updateTodo 함수 SHALL 세션 userSeq를 내부적으로 사용하며 userSeq를 AI가 제어할 수 있는 매개변수로 받지 않는다
5. THE Todo_Service 메서드 SHALL 작업을 수행하기 전에 요청된 할 일이 세션 userSeq에 속하는지 확인한다
6. IF 할 일이 세션 userSeq에 속하지 않으면, THE Todo_Service SHALL 다른 사용자의 데이터를 노출하지 않고 오류 또는 빈 결과를 반환한다
7. THE 함수 도구 정의 SHALL Gemini가 지정할 수 있는 매개변수로 userSeq를 포함하지 않는다

### 요구사항 5: 데이터베이스 작업에 대한 완전한 감사 추적

**사용자 스토리:** 시스템 관리자로서, 모든 할 일 생성 및 업데이트 작업이 완전한 감사 컬럼(reg_id, reg_ip, reg_dtm, upd_id, upd_ip, upd_dtm)을 채우기를 원하므로, 규정 준수 및 디버깅 목적으로 각 레코드를 생성하고 수정한 사람을 추적할 수 있습니다.

#### 인수 기준

1. THE ChatController SHALL 세션에서 인증된 사용자의 userId를 AI_Assistant_Service에 전달한다
2. THE AI_Assistant_Service SHALL userId 매개변수를 createTodo 및 updateTodo 함수에 전달한다
3. WHEN 새 할 일을 생성할 때, THE System SHALL reg_id를 세션 userId로 채운다
4. WHEN 새 할 일을 생성할 때, THE System SHALL reg_ip를 클라이언트 IP 주소로 채운다
5. WHEN 새 할 일을 생성할 때, THE System SHALL reg_dtm을 현재 서버 타임스탬프로 채운다
6. WHEN 새 할 일을 생성할 때, THE System SHALL upd_id도 세션 userId로 채운다
7. WHEN 새 할 일을 생성할 때, THE System SHALL upd_ip도 클라이언트 IP 주소로 채운다
8. WHEN 새 할 일을 생성할 때, THE System SHALL upd_dtm도 현재 서버 타임스탬프로 채운다
9. WHEN 기존 할 일을 업데이트할 때, THE System SHALL upd_id를 세션 userId로 채운다
10. WHEN 기존 할 일을 업데이트할 때, THE System SHALL upd_ip를 클라이언트 IP 주소로 채운다
11. WHEN 기존 할 일을 업데이트할 때, THE System SHALL upd_dtm을 현재 서버 타임스탬프로 채운다
12. THE setAuditColumn 유틸리티 함수 SHALL 생성 작업 시 reg_* 및 upd_* 컬럼을 모두 초기화한다
13. THE setAuditColumn 유틸리티 함수 SHALL 업데이트 작업 시 upd_* 컬럼만 업데이트한다

### 요구사항 6: AI 작업 후 프론트엔드 자동 새로고침

**사용자 스토리:** 사용자로서, AI 채팅을 통해 작업을 생성하거나 업데이트할 때 메인 할 일 목록 UI가 자동으로 새로고침되기를 원하므로, 페이지를 수동으로 새로고침하지 않고도 변경 사항을 즉시 볼 수 있습니다.

#### 인수 기준

1. WHEN ChatModal이 AI 어시스턴트로부터 성공적인 API 응답을 받을 때, THE System SHALL 새로고침 이벤트를 트리거한다
2. THE TodoListComponent SHALL 새로고침 이벤트를 수신한다
3. WHEN TodoListComponent가 새로고침 이벤트를 받을 때, THE System SHALL 할 일 목록을 다시 로드하기 위해 데이터 가져오기 함수를 호출한다
4. THE 새로고침 메커니즘 SHALL 기존 Zustand 상태 관리 아키텍처를 사용한다
5. THE 새로고침 SHALL 사용자 상호작용 없이 자동으로 발생한다
6. THE 새로고침 SHALL 할 일 목록에서 현재 선택된 날짜를 방해하지 않는다
7. THE System SHALL 일관성을 보장하기 위해 모든 성공적인 AI 채팅 응답에 대해 새로고침을 트리거한다

## 보안 고려사항

### 세션 강제
- 모든 할 일 작업은 인증된 세션의 userSeq를 사용해야 함
- AI는 userSeq 매개변수를 지정하거나 재정의할 수 없음
- 데이터베이스 쿼리는 데이터 유출을 방지하기 위해 userSeq로 필터링해야 함

### 입력 검증
- 콘텐츠 기반 검색은 주입 공격을 방지하기 위해 사용자 입력을 정제해야 함
- 날짜 파싱은 잘못된 날짜를 방지하기 위해 형식과 범위를 검증해야 함
- 모든 사용자 입력은 데이터베이스 쿼리에 사용되기 전에 검증되어야 함

## 성능 고려사항

### 콘텐츠 기반 검색
- 콘텐츠 일치는 적절한 인덱싱을 사용한 효율적인 데이터베이스 쿼리를 사용해야 함
- 퍼지 매칭은 성능 저하를 방지하기 위해 제한되어야 함
- 더 나은 사용자 경험을 위해 검색은 대소문자를 구분하지 않아야 함

### 사전 새로고침
- 자동 목록 새로고침은 관련 할 일만 가져와야 함 (전체 데이터베이스가 아님)
- 새로고침을 위한 날짜 범위는 지능적이어야 함 (예: 작업 날짜로부터 ±7일)
- 응답 크기는 느린 API 응답을 방지하기 위해 합리적이어야 함
