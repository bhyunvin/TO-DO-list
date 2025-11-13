# 요구사항 문서

## 소개

이 사양은 Todo List 애플리케이션을 위한 AI 어시스턴트 채팅 인터페이스 구현에 대한 요구사항을 정의합니다. 이 기능은 사용자에게 함수 호출 기능을 갖춘 기존 Google Gemini AI 통합을 활용하여 한국어로 자연어 쿼리를 사용하여 todo 데이터와 상호 작용할 수 있는 대화형 인터페이스를 제공합니다.

## 용어집

- **AI_Assistant_Service**: Google Gemini API와의 통신을 처리하는 백엔드 NestJS 서비스
- **Chat_Interface**: 대화형 UI를 제공하는 프론트엔드 React 모달 컴포넌트
- **Floating_Action_Button**: 채팅 인터페이스를 트리거하는 고정 위치 버튼
- **Function_Calling**: AI가 데이터베이스를 쿼리하기 위해 미리 정의된 함수를 호출할 수 있도록 하는 Gemini API 기능
- **Todo_Service**: todo 데이터 액세스 메서드를 제공하는 백엔드 서비스
- **Chat_Modal**: 대화 인터페이스를 포함하는 팝업 창
- **Message_Thread**: 대화에서 사용자 및 AI 메시지의 시퀀스

## 요구사항

### 요구사항 1

**사용자 스토리:** 사용자로서, 플로팅 버튼을 통해 AI 어시스턴트에 액세스하고 싶습니다. 그래야 현재 보기에서 벗어나지 않고도 빠르게 todo에 대한 질문을 할 수 있습니다.

#### 수락 기준

1. Chat_Interface는 화면 오른쪽 하단에 고정된 Floating_Action_Button을 표시해야 합니다
2. 사용자가 Floating_Action_Button을 클릭하면, Chat_Interface는 Chat_Modal 오버레이를 열어야 합니다
3. Floating_Action_Button은 적절한 AI 또는 채팅 아이콘을 표시해야 합니다
4. Chat_Modal이 열려 있는 동안, Floating_Action_Button은 닫기 아이콘으로 변경되어야 합니다
5. 사용자가 닫기 아이콘 또는 모달 외부를 클릭하면, Chat_Modal이 닫혀야 합니다

### 요구사항 2

**사용자 스토리:** 사용자로서, todo에 대한 한국어 자연어 질문을 입력하고 싶습니다. 그래야 작업 관리에 대한 지능적인 응답을 받을 수 있습니다.

#### 수락 기준

1. Chat_Modal에는 사용자 메시지를 위한 텍스트 입력 필드가 포함되어야 합니다
2. 사용자가 메시지를 입력하고 Enter를 누르거나 전송을 클릭하면, Chat_Interface는 메시지를 AI_Assistant_Service로 전송해야 합니다
3. Chat_Interface는 적절한 스타일로 Message_Thread에 사용자 메시지를 표시해야 합니다
4. Chat_Interface는 AI 응답을 기다리는 동안 로딩 표시기를 표시해야 합니다
5. AI_Assistant_Service가 응답을 반환하면, Chat_Interface는 Message_Thread에 HTML 형식의 응답을 표시해야 합니다

### 요구사항 3

**사용자 스토리:** 사용자로서, AI가 질문에 답할 때 실제 todo 데이터에 액세스하기를 원합니다. 그래야 내 작업에 대한 정확하고 개인화된 응답을 받을 수 있습니다.

#### 수락 기준

1. AI가 사용자 쿼리에 todo 데이터가 필요하다고 판단하면, AI_Assistant_Service는 Function_Calling을 사용하여 todo 정보를 요청해야 합니다
2. AI_Assistant_Service는 적절한 매개변수(status, days)로 getTodos 함수를 실행해야 합니다
3. AI_Assistant_Service는 자연어 응답 생성을 위해 todo 데이터를 Gemini API로 다시 전송해야 합니다
4. AI_Assistant_Service는 새니타이즈된 HTML로 형식화된 최종 한국어 응답을 반환해야 합니다
5. Chat_Interface는 형식 및 스타일을 유지하면서 HTML 응답을 렌더링해야 합니다

### 요구사항 4

**사용자 스토리:** 사용자로서, AI가 정중한 한국어로 todo 관련 질문에만 응답하기를 원합니다. 그래야 어시스턴트가 집중을 유지하고 적절한 의사소통 스타일을 유지합니다.

#### 수락 기준

1. AI_Assistant_Service는 시스템 프롬프트를 사용하여 한국어 존댓말을 적용해야 합니다
2. 사용자가 todo와 관련 없는 질문을 하면, AI_Assistant_Service는 "죄송하지만 할 일 관리와 관련된 요청만 도와드릴 수 있습니다."라는 거부 메시지로 응답해야 합니다
3. AI_Assistant_Service는 todo 관리에 대한 간결하고 명확한 답변을 제공해야 합니다
4. AI_Assistant_Service는 대화 전반에 걸쳐 일관된 정중한 어조를 유지해야 합니다
5. AI_Assistant_Service는 적절한 한국어 오류 메시지로 오류를 우아하게 처리해야 합니다

### 요구사항 5

**사용자 스토리:** 사용자로서, 채팅 인터페이스에서 대화 기록을 보고 싶습니다. 그래야 세션 중에 이전 질문과 답변을 참조할 수 있습니다.

#### 수락 기준

1. Chat_Interface는 시간순으로 모든 사용자 및 AI 메시지를 표시하는 Message_Thread를 유지해야 합니다
2. Chat_Interface는 다른 스타일로 사용자 메시지와 AI 응답을 구별해야 합니다
3. Chat_Interface는 새 메시지가 추가될 때 자동으로 최신 메시지로 스크롤해야 합니다
4. Chat_Interface는 모달이 닫히고 다시 열리거나 페이지가 새로 고쳐져도 세션 스토리지를 사용하여 대화 기록을 유지해야 합니다
5. Chat_Interface는 적절한 텍스트 래핑 및 스크롤로 긴 메시지를 처리해야 합니다

### 요구사항 6

**사용자 스토리:** 사용자로서, 채팅 인터페이스가 반응형이고 접근 가능하기를 원합니다. 그래야 다양한 장치와 보조 기술에서 효과적으로 사용할 수 있습니다.

#### 수락 기준

1. Chat_Interface는 반응형이어야 하며 모바일 및 데스크톱 화면 크기에서 제대로 작동해야 합니다
2. Chat_Interface는 접근성을 위한 키보드 탐색을 지원해야 합니다
3. Chat_Interface는 스크린 리더를 위한 적절한 ARIA 레이블 및 역할을 제공해야 합니다
4. Chat_Interface는 모달을 열고 닫을 때 포커스 관리를 유지해야 합니다
5. Chat_Interface는 모달을 닫기 위한 Escape 키 기능을 제공해야 합니다
