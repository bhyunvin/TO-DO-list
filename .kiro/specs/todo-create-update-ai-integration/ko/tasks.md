# 구현 계획

- [x] 1. 삭제 요청을 차단하도록 시스템 프롬프트 업데이트
  - assistance.systemPrompt.txt에 [DELETION_RESTRICTION] 섹션 추가 및 삭제에 대한 명시적 규칙 포함
  - 삭제 요청에 대한 한국어 거부 메시지 포함
  - 지원되는 작업(생성, 읽기, 업데이트) 및 지원되지 않는 작업(삭제, del_yn 수정) 지정
  - _요구사항: 3.1, 3.2, 3.3, 3.5_

- [x] 2. 생성 및 업데이트 작업을 위한 Gemini 함수 선언 추가
  - [x] 2.1 AssistanceService에 createTodo 함수 선언 생성
    - 함수 이름, 한국어 설명 정의
    - 명확한 설명과 함께 todoContent 매개변수(STRING, 필수) 추가
    - YYYY-MM-DD 형식 지정과 함께 todoDate 매개변수(STRING, 필수) 추가
    - 추가 메모를 위한 todoNote 매개변수(STRING, 선택 사항) 추가
    - 필수 필드 배열을 ['todoContent', 'todoDate']로 설정
    - _요구사항: 4.1, 4.2, 4.5_
  
  - [x] 2.2 AssistanceService에 updateTodo 함수 선언 생성
    - 함수 이름, 한국어 설명 정의
    - TODO 식별을 위한 todoSeq 매개변수(NUMBER, 필수) 추가
    - 내용 업데이트를 위한 todoContent 매개변수(STRING, 선택 사항) 추가
    - 완료 상태를 위한 completeDtm 매개변수(STRING, 선택 사항) 추가
    - 메모 업데이트를 위한 todoNote 매개변수(STRING, 선택 사항) 추가
    - 필수 필드 배열을 ['todoSeq']로 설정
    - _요구사항: 4.3, 4.4, 4.5_
  
  - [x] 2.3 세 가지 함수 선언을 모두 포함하도록 getGeminiResponse의 tools 배열 업데이트
    - tools 배열에 getTodosTool, createTodoTool, updateTodoTool 결합
    - _요구사항: 1.1, 2.1_

- [x] 3. AssistanceService에 createTodo 핸들러 메서드 구현
  - [x] 3.1 매개변수(userSeq, ip, todoContent, todoDate, todoNote)를 사용하여 private createTodo 메서드 생성
    - 적절한 TypeScript 타입으로 메서드 시그니처 추가
    - 목적 및 매개변수를 설명하는 JSDoc 주석 추가
    - _요구사항: 1.1, 1.2_
  
  - [x] 3.2 날짜 유효성 검사 및 형식 지정 구현
    - todoDate가 YYYY-MM-DD 형식인지 유효성 검사
    - 날짜 형식이 잘못된 경우 오류 응답 반환
    - _요구사항: 1.5_
  
  - [x] 3.3 사용자 객체 및 DTO로 TodoService.create 호출
    - userSeq로 사용자 객체 구성(함수 호출의 경우 userId는 빈 문자열일 수 있음)
    - todoContent, todoDate 및 선택적 todoNote로 CreateTodoDto 생성
    - this.todoService.create(user, ip, createTodoDto) 호출
    - _요구사항: 1.1, 1.3_
  
  - [x] 3.4 생성된 TODO 데이터로 성공 응답 형식 지정
    - success: true 및 TODO 데이터로 구조화된 응답 반환
    - todoSeq, todoContent, todoDate, todoNote 및 생성 타임스탬프 포함
    - _요구사항: 1.3, 5.1_
  
  - [x] 3.5 오류 처리 및 로깅 구현
    - try-catch 블록으로 래핑
    - this.logger.error로 오류 로그
    - success: false 및 사용자 친화적인 메시지로 구조화된 오류 응답 반환
    - _요구사항: 1.4, 5.3_

- [x] 4. AssistanceService에 updateTodo 핸들러 메서드 구현
  - [x] 4.1 매개변수(userSeq, ip, todoSeq, updateData)를 사용하여 private updateTodo 메서드 생성
    - 적절한 TypeScript 타입으로 메서드 시그니처 추가
    - 선택적 필드로 updateData 인터페이스 정의
    - 목적 및 매개변수를 설명하는 JSDoc 주석 추가
    - _요구사항: 2.1, 2.2_
  
  - [x] 4.2 TODO ID 및 업데이트 DTO로 TodoService.update 호출
    - userSeq로 사용자 객체 구성
    - 제공된 필드만으로 UpdateTodoDto 생성(부분 업데이트)
    - this.todoService.update(todoSeq, user, ip, updateTodoDto) 호출
    - _요구사항: 2.1, 2.2_
  
  - [x] 4.3 "찾을 수 없음" 케이스 명시적 처리
    - TodoService.update가 null을 반환하는지 확인
    - 구조화된 오류 응답 반환: { success: false, error: 'TODO item not found or access denied' }
    - _요구사항: 2.5, 5.3_
  
  - [x] 4.4 업데이트된 TODO 데이터로 성공 응답 형식 지정
    - success: true 및 업데이트된 TODO 데이터로 구조화된 응답 반환
    - 응답에 모든 TODO 필드 포함
    - _요구사항: 2.1, 5.2_
  
  - [x] 4.5 오류 처리 및 로깅 구현
    - try-catch 블록으로 래핑
    - this.logger.error로 오류 로그
    - 사용자 친화적인 메시지로 구조화된 오류 응답 반환
    - _요구사항: 5.3_

- [x] 5. 새로운 함수 호출을 처리하도록 getGeminiResponse 메서드 개선
  - [x] 5.1 getGeminiResponse 메서드 시그니처에 ip 매개변수 추가
    - 메서드 시그니처 업데이트: getGeminiResponse(requestAssistanceDto, userSeq?, ip?)
    - JSDoc 주석 업데이트
    - _요구사항: 1.1, 2.1_
  
  - [x] 5.2 switch 문으로 함수 호출 감지 로직 확장
    - if 문을 functionCall.name에 대한 switch로 교체
    - 'getTodos'에 대한 case 추가(기존 로직)
    - this.createTodo()를 호출하는 'createTodo'에 대한 case 추가
    - this.updateTodo()를 호출하는 'updateTodo'에 대한 case 추가
    - 각 case에 대해 함수 인수를 적절하게 추출
    - _요구사항: 1.1, 2.1_
  
  - [x] 5.3 Gemini에 대한 함수 응답이 적절하게 형식화되었는지 확인
    - 기존 functionResponse 구조 유지
    - 함수 결과를 응답의 content로 전달
    - _요구사항: 1.3, 2.1_

- [x] 6. AssistanceService에 IP 주소를 전달하도록 ChatController 업데이트
  - chat 메서드 매개변수에 @Ip() 데코레이터 추가
  - this.assistanceService.getGeminiResponse()에 ip 매개변수 전달
  - _요구사항: 1.1, 2.1_

- [ ]* 7. 수동 테스트를 통해 삭제 방지 확인
  - 개발 서버 시작
  - 한국어로 삭제 요청 테스트: "할 일 삭제해줘"
  - ID로 삭제 요청 테스트: "TODO 5번 지워줘"
  - del_yn 수정 요청 테스트
  - AI가 일관된 메시지로 모든 삭제 시도를 거부하는지 확인
  - 삭제 요청에 대해 함수 호출이 이루어지지 않는지 확인
  - _요구사항: 3.1, 3.2, 3.4, 3.5_

- [ ]* 8. 수동 테스트를 통해 생성 기능 확인
  - 내용 및 날짜로 TODO 생성 테스트: "내일 회의 준비 할 일 추가해줘"
  - 메모로 TODO 생성 테스트: "다음 주 월요일 보고서 작성, 초안 먼저 작성하기"
  - 명시적 날짜 없이 오늘 TODO 생성 테스트
  - AI가 TODO 세부 정보로 생성을 확인하는지 확인
  - TODO가 올바른 데이터로 데이터베이스에 나타나는지 확인
  - _요구사항: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.4_

- [ ]* 9. 수동 테스트를 통해 업데이트 기능 확인
  - 먼저 TODO 생성
  - 완료로 표시 테스트: "할 일 [ID] 완료 처리해줘"
  - 내용 업데이트 테스트: "할 일 [ID]의 내용을 '새로운 내용'으로 바꿔줘"
  - 메모 추가 테스트: "할 일 [ID]에 메모 추가해줘"
  - 완료 후 미완료로 표시 테스트
  - AI가 변경된 세부 정보로 업데이트를 확인하는지 확인
  - 업데이트가 데이터베이스에 반영되는지 확인
  - _요구사항: 2.1, 2.2, 2.3, 2.4, 2.5, 5.2, 5.4, 5.5_
