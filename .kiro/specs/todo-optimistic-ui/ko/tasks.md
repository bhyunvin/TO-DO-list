# 구현 계획

- [x] 1. TodoContainer에 낙관적 업데이트 상태 관리 추가
  - 보류 중인 업데이트를 추적하기 위해 Map을 사용하여 `optimisticUpdates` 상태 추가
  - `useState(new Map())`으로 상태 초기화
  - _요구사항: 1.1, 1.5, 4.2_

- [x] 2. 상태 관리를 위한 헬퍼 함수 생성
  - [x] 2.1 `updateTodoOptimistically` 함수 구현
    - todos 배열에서 특정 todo의 completeDtm을 불변으로 업데이트하는 함수 작성
    - map으로 대상 todo를 찾고 업데이트하는 함수형 setState 사용
    - _요구사항: 1.2, 1.3_
  
  - [x] 2.2 `rollbackTodoUpdate` 함수 구현
    - todo의 completeDtm을 원래 값으로 되돌리는 함수 작성
    - map으로 대상 todo를 찾고 복원하는 함수형 setState 사용
    - _요구사항: 2.1, 2.2, 2.3_
  
  - [x] 2.3 `getErrorMessage` 함수 구현
    - 오류 유형에 따라 사용자 친화적인 오류 메시지를 생성하는 함수 작성
    - AbortError, TypeError(네트워크) 및 HTTP 상태 코드 처리
    - 각 오류 유형에 대한 적절한 한국어 오류 메시지 반환
    - _요구사항: 2.4, 3.1, 3.2, 3.3_

- [x] 3. 낙관적 UI 패턴을 사용하도록 handleToggleComplete 리팩토링
  - [x] 3.1 중복 요청 방지 로직 추가
    - 동일한 todoSeq에 대해 요청이 이미 진행 중인지 확인
    - optimisticUpdates Map에 todoSeq가 포함되어 있으면 조기 반환
    - _요구사항: 1.5, 4.5_
  
  - [x] 3.2 낙관적 상태 업데이트 구현
    - todos 배열에서 원래 todo 항목 찾기 및 저장
    - 새 completeDtm 값 계산(완료 시 null, 미완료 시 ISO 문자열)
    - updateTodoOptimistically를 호출하여 UI를 즉시 업데이트
    - 원래 및 새 값으로 optimisticUpdates Map에 항목 추가
    - 체크박스를 비활성화하기 위해 togglingTodoSeq 설정
    - _요구사항: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 3.3 타임아웃으로 백그라운드 API 호출 구현
    - 30초 타임아웃을 위한 AbortController 생성
    - completeDtm을 본문에 포함하여 /api/todo/:id에 PATCH 요청 전송
    - 오류 처리를 위한 try-catch 블록 사용
    - 응답 시 타임아웃 지우기
    - _요구사항: 1.4, 3.1_
  
  - [x] 3.4 성공 핸들러 구현
    - optimisticUpdates Map에서 항목 제거
    - togglingTodoSeq 상태 지우기
    - todoSeq 및 타임스탬프로 콘솔에 성공 로그
    - todos를 가져오지 않음(UI가 이미 올바름)
    - _요구사항: 2.5, 4.4_
  
  - [x] 3.5 롤백으로 실패 핸들러 구현
    - 원래 completeDtm으로 rollbackTodoUpdate 호출
    - optimisticUpdates Map에서 항목 제거
    - togglingTodoSeq 상태 지우기
    - getErrorMessage를 사용하여 적절한 오류 메시지 가져오기
    - 오류 메시지로 SweetAlert2 토스트 알림 표시
    - todoSeq, 오류 메시지 및 상태를 포함하여 콘솔에 오류 세부 정보 로그
    - _요구사항: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

- [x] 4. 토스트 스타일을 사용하도록 오류 알림 업데이트
  - 기존 Swal.fire 오류 알림을 토스트 알림으로 교체
  - top-end 위치에 나타나도록 토스트 구성
  - 진행 표시줄로 타이머를 4000ms로 설정
  - 실패한 작업에 'error' 아이콘 사용
  - _요구사항: 2.4_

- [x] 5. 여러 todo 토글의 독립적 처리 확인
  - optimisticUpdates Map이 여러 보류 중인 요청을 올바르게 추적하는지 확인
  - 각 todo의 상태가 독립적으로 업데이트되고 롤백되는지 확인
  - togglingTodoSeq가 동일한 항목에 대한 중복 클릭만 방지하는지 확인
  - _요구사항: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6. 디버깅을 위한 콘솔 로깅 추가
  - todoSeq 및 새 상태로 낙관적 업데이트 적용 로그
  - todoSeq로 성공적인 API 응답 로그
  - todoSeq, 오류 및 원래 상태로 롤백 이벤트 로그
  - 모든 로그 메시지에 타임스탬프 포함
  - _요구사항: 3.4_
