# 요구사항 문서

## 소개

이 기능은 사용자가 사용자 지정 가능한 날짜 범위 필터링으로 todo 항목을 Excel(.xlsx) 파일 형식으로 내보낼 수 있도록 합니다. 내보내기 기능은 사용자가 오프라인 참조, 보고 또는 공유 목적으로 다운로드하고 사용할 수 있는 적절한 스타일 및 레이아웃으로 형식화된 스프레드시트를 제공합니다.

## 용어집

- **Todo System**: 사용자 작업을 저장하고 관리하는 기존 todo 관리 애플리케이션
- **Excel Export API**: Excel 파일을 생성하고 반환하는 백엔드 REST 엔드포인트
- **Date Range Filter**: 내보내기에 포함될 todo를 제한하는 사용자 지정 시작 및 종료 날짜
- **Export Button**: Excel 내보내기 워크플로를 시작하는 프론트엔드 UI 컨트롤
- **Date Selection Modal**: 사용자가 내보내기 날짜 범위를 지정할 수 있는 팝업 대화 상자
- **Excel Workbook**: 형식화된 todo 데이터를 포함하는 생성된 .xlsx 파일

## 요구사항

### 요구사항 1: Excel 내보내기 API 엔드포인트

**사용자 스토리:** 사용자로서, API 엔드포인트를 통해 todo의 Excel 내보내기를 요청하고 싶습니다. 그래야 프로그래밍 방식으로 스프레드시트 형식의 todo 데이터를 검색할 수 있습니다

#### 수락 기준

1. Todo System은 Excel 파일을 생성하는 `/api/todo/excel`에 GET 엔드포인트를 제공해야 합니다
2. 사용자가 Excel 내보내기 엔드포인트를 요청하면, Todo System은 `startDate` 및 `endDate`를 쿼리 매개변수로 허용해야 합니다
3. Excel 파일을 생성할 때, Todo System은 `del_yn = 'N'`인 todo를 필터링해야 합니다
4. 날짜 범위 매개변수가 제공되면, Todo System은 지정된 날짜 범위 내의 todo만 포함해야 합니다
5. Todo System은 적절한 content-type 헤더로 다운로드 가능한 버퍼로 Excel 파일을 반환해야 합니다

### 요구사항 2: Excel 파일 구조 및 형식

**사용자 스토리:** 사용자로서, 내보낸 Excel 파일이 적절한 형식으로 깔끔하고 전문적인 레이아웃을 갖기를 원합니다. 그래야 데이터를 읽고 사용하기 쉽습니다

#### 수락 기준

1. Todo System은 너비 4로 비어 있는 열 A로 Excel 통합 문서를 생성해야 합니다
2. Todo System은 비어 있는 행 1로 Excel 통합 문서를 생성해야 합니다
3. Todo System은 "번호", "내용", "완료일시" 및 "비고" 값으로 셀 B2~E2에 헤더 레이블을 배치해야 합니다
4. Todo System은 헤더 범위 B2:E2에 연한 회색 배경 채우기를 적용해야 합니다
5. Todo System은 헤더 범위 B2:E2의 셀 모든 면에 테두리를 적용해야 합니다
6. Todo System은 열 너비를 다음과 같이 설정해야 합니다: 열 A는 4, 열 B는 6, 열 C는 80, 열 D는 17, 열 E는 90
7. Todo System은 행 1, 행 2 및 todo 항목을 포함하는 모든 데이터 행에 대해 행 높이를 15로 설정해야 합니다

### 요구사항 3: Excel 데이터 채우기

**사용자 스토리:** 사용자로서, todo 데이터가 적절한 형식으로 Excel 파일에 정확하게 채워지기를 원합니다. 그래야 오프라인에서 작업을 검토하고 분석할 수 있습니다

#### 수락 기준

1. Todo System은 행 3부터 todo 데이터를 채워야 합니다
2. Todo System은 각 todo 항목에 대해 `todo.seq`를 열 B에 매핑해야 합니다
3. Todo System은 각 todo 항목에 대해 `todo.todo_content`를 열 C에 매핑해야 합니다
4. Todo System은 각 todo 항목에 대해 "YYYY-MM-DD HH:mm"로 형식화된 `todo.complete_dtm`을 열 D에 매핑해야 합니다
5. Todo System은 각 todo 항목에 대해 `todo.todo_note`를 열 E에 매핑해야 합니다

### 요구사항 4: Excel 내보내기 버튼 UI

**사용자 스토리:** 사용자로서, todo 인터페이스에 명확하게 보이는 Excel 내보내기 버튼을 원합니다. 그래야 내보내기 프로세스를 쉽게 시작할 수 있습니다

#### 수락 기준

1. Todo System은 todo 페이지의 오른쪽 상단 영역에 Excel 내보내기 버튼을 표시해야 합니다
2. Todo System은 기존 "신규" 버튼의 왼쪽에 Excel 내보내기 버튼을 배치해야 합니다
3. Todo System은 배경 채우기 없이 녹색 윤곽선 모양으로 Excel 내보내기 버튼을 스타일링해야 합니다
4. 사용자가 todo 페이지를 볼 때, Todo System은 Excel 내보내기 버튼이 보이고 액세스 가능하도록 보장해야 합니다

### 요구사항 5: 날짜 범위 선택 모달

**사용자 스토리:** 사용자로서, 내보내기 전에 사용자 지정 날짜 범위를 선택하고 싶습니다. 그래야 Excel 파일에 포함될 todo를 제어할 수 있습니다

#### 수락 기준

1. 사용자가 Excel 내보내기 버튼을 클릭하면, Todo System은 날짜 선택 컨트롤이 있는 모달 대화 상자를 표시해야 합니다
2. Todo System은 모달 내에 시작 날짜 선택기 컨트롤을 제공해야 합니다
3. Todo System은 모달 내에 종료 날짜 선택기 컨트롤을 제공해야 합니다
4. Todo System은 모바일 호환성을 위해 시작 날짜 및 종료 날짜 선택기를 세로로 배열해야 합니다
5. 사용자가 날짜 선택을 확인하면, Todo System은 선택한 startDate 및 endDate 매개변수로 Excel 내보내기 API를 호출해야 합니다
6. API 응답이 수신되면, Todo System은 Excel 통합 문서의 파일 다운로드를 트리거해야 합니다
