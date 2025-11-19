# 설계 문서

## 개요

이 기능은 기존 Todo 애플리케이션에 Excel 내보내기 기능을 추가하여 사용자가 지정된 날짜 범위 내의 todo 항목을 전문적으로 포맷된 .xlsx 파일로 내보낼 수 있도록 합니다. 구현은 기존 NestJS 백엔드 및 React 프론트엔드 아키텍처 패턴을 따르며, 현재 todo 관리 시스템과 원활하게 통합됩니다.

## 아키텍처

### 백엔드 아키텍처

Excel 내보내기 기능은 기존 `TodoController`의 새로운 엔드포인트와 `TodoService`의 새로운 메서드로 구현됩니다. 구현은 `exceljs` 라이브러리를 사용하여 사용자 정의 포맷팅이 적용된 Excel 파일을 생성합니다.

**컴포넌트 흐름:**
```
클라이언트 요청 → TodoController.exportToExcel() → TodoService.exportToExcel() → ExcelJS → 응답 (Buffer)
```

### 프론트엔드 아키텍처

프론트엔드는 TodoContainer 컴포넌트의 액션 바에 새로운 Excel 내보내기 버튼을 추가합니다. 클릭하면 날짜 범위 선택기가 있는 SweetAlert2 모달을 표시한 다음 API 호출 및 파일 다운로드를 트리거합니다.

**컴포넌트 흐름:**
```
Excel 버튼 클릭 → SweetAlert 모달 → 날짜 선택 → API 호출 → 파일 다운로드
```

## 컴포넌트 및 인터페이스

### 백엔드 컴포넌트

#### 1. TodoController 개선

**새로운 엔드포인트:**
- **라우트:** `GET /api/todo/excel`
- **쿼리 파라미터:**
  - `startDate`: string (형식: YYYY-MM-DD)
  - `endDate`: string (형식: YYYY-MM-DD)
- **응답:** 적절한 헤더가 포함된 Excel 파일 버퍼
- **인증:** `AuthenticatedGuard`로 보호됨

**응답 헤더:**
```typescript
{
  'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'Content-Disposition': 'attachment; filename="todos_YYYY-MM-DD_to_YYYY-MM-DD.xlsx"'
}
```

#### 2. TodoService 개선

**새로운 메서드:**
```typescript
async exportToExcel(
  userSeq: number,
  startDate: string,
  endDate: string
): Promise<Buffer>
```

**책임:**
- `del_yn = 'N'`인 날짜 범위 내의 todos 쿼리
- exceljs를 사용하여 Excel 워크북 생성
- 포맷팅 및 스타일링 적용
- 다운로드를 위한 버퍼 반환

#### 3. Excel 생성 로직

**워크북 구조:**
- "Todos"라는 이름의 단일 워크시트
- 열 A: 비어있음 (예약됨)
- 행 1: 비어있음 (예약됨)
- 행 2: 스타일링이 적용된 헤더
- 행 3+: 데이터 행

**열 구성:**
```typescript
{
  A: { width: 4 },      // 비어있음 (보이지만 내용 없음)
  B: { width: 6 },      // 번호
  C: { width: 80 },     // 내용
  D: { width: 17 },     // 완료일시
  E: { width: 90 }      // 비고
}
```

**행 구성:**
```typescript
{
  Row 1: { height: 15 },     // 빈 행
  Row 2: { height: 15 },     // 헤더 행
  Row 3+: { height: 15 }     // 데이터 행 (각 todo 항목마다)
}
```

**헤더 스타일링:**
- 배경: 연한 회색 (#D3D3D3)
- 테두리: 모든 면, 얇은 스타일
- 폰트: 굵게
- 정렬: 가운데

### 프론트엔드 컴포넌트

#### 1. TodoContainer 개선

**새로운 UI 요소:**
- "신규" 버튼 왼쪽에 위치한 Excel 내보내기 버튼
- 버튼 스타일링: `btn btn-outline-success`
- 버튼 텍스트: "Excel" 또는 "Excel 내보내기"

#### 2. 날짜 범위 선택 모달

**SweetAlert2를 사용한 구현:**
```javascript
Swal.fire({
  title: 'Excel 내보내기',
  html: `
    <div class="date-range-container">
      <div class="date-picker-wrapper">
        <label>시작일</label>
        <input type="date" id="startDate" class="swal2-input" />
      </div>
      <div class="date-picker-wrapper">
        <label>종료일</label>
        <input type="date" id="endDate" class="swal2-input" />
      </div>
    </div>
  `,
  showCancelButton: true,
  confirmButtonText: '내보내기',
  cancelButtonText: '취소',
  preConfirm: () => {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
      Swal.showValidationMessage('날짜를 선택해주세요');
      return false;
    }
    
    if (startDate > endDate) {
      Swal.showValidationMessage('시작일은 종료일보다 이전이어야 합니다');
      return false;
    }
    
    return { startDate, endDate };
  }
})
```

**모달 기능:**
- 모바일 호환성을 위한 날짜 선택기의 수직 스택
- 필수 필드에 대한 유효성 검사
- 논리적 날짜 범위에 대한 유효성 검사
- 기본값: 현재 월의 첫날과 마지막 날

#### 3. 파일 다운로드 핸들러

**구현:**
```javascript
async function handleExcelExport() {
  const result = await showDateRangeModal();
  
  if (result.isConfirmed) {
    const { startDate, endDate } = result.value;
    
    try {
      const response = await api(
        `/api/todo/excel?startDate=${startDate}&endDate=${endDate}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `todos_${startDate}_to_${endDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        Swal.fire('성공', 'Excel 파일이 다운로드되었습니다.', 'success');
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      Swal.fire('오류', 'Excel 내보내기에 실패했습니다.', 'error');
    }
  }
}
```

## 데이터 모델

### 쿼리 필터

백엔드는 다음 기준을 사용하여 todos를 쿼리합니다:

```typescript
{
  userSeq: number,
  todoDate: Between(startDate, endDate),
  delYn: 'N'
}
```

**정렬 순서:**
- 주요: `todoDate` ASC
- 보조: `todoSeq` ASC

### Excel 데이터 매핑

각 todo 행은 다음과 같이 매핑됩니다:

| 열 | 필드 | 형식 | 예시 |
|--------|-------|--------|---------|
| B | `todo.todoSeq` | 숫자 | 1 |
| C | `todo.todoContent` | 텍스트 | "프로젝트 문서 작성" |
| D | `todo.completeDtm` | YYYY-MM-DD HH:mm | "2024-11-12 14:30" |
| E | `todo.todoNote` | 텍스트 | "긴급 처리 필요" |

**Null 처리:**
- `completeDtm`: null인 경우 빈 문자열 표시
- `todoNote`: null인 경우 빈 문자열 표시

## 오류 처리

### 백엔드 오류 시나리오

1. **잘못된 날짜 형식**
   - 상태: 400 Bad Request
   - 메시지: "Invalid date format. Use YYYY-MM-DD"

2. **누락된 파라미터**
   - 상태: 400 Bad Request
   - 메시지: "startDate and endDate are required"

3. **인증되지 않은 접근**
   - 상태: 401 Unauthorized
   - 메시지: "Authentication required"

4. **Excel 생성 실패**
   - 상태: 500 Internal Server Error
   - 메시지: "Failed to generate Excel file"
   - 디버깅을 위한 오류 세부사항 로그

### 프론트엔드 오류 시나리오

1. **네트워크 오류**
   - 표시: SweetAlert 오류 모달
   - 메시지: "서버와의 통신 중 문제가 발생했습니다."

2. **잘못된 날짜 선택**
   - 표시: 모달 내 인라인 유효성 검사 메시지
   - 메시지: "시작일은 종료일보다 이전이어야 합니다"

3. **빈 날짜 필드**
   - 표시: 모달 내 인라인 유효성 검사 메시지
   - 메시지: "날짜를 선택해주세요"

4. **다운로드 실패**
   - 표시: SweetAlert 오류 모달
   - 메시지: "Excel 내보내기에 실패했습니다."

## 테스트 전략

### 백엔드 테스트

#### 단위 테스트

1. **TodoService.exportToExcel()**
   - 유효한 데이터로 성공적인 Excel 생성 테스트
   - 빈 결과 세트 처리 테스트
   - 날짜 범위 필터링 테스트
   - del_yn 필터링 테스트
   - Excel 셀의 날짜 포맷팅 테스트
   - 열 너비 구성 테스트
   - 헤더 스타일링 적용 테스트

2. **TodoController.exportToExcel()**
   - 올바른 헤더로 성공적인 응답 테스트
   - 인증 가드 적용 테스트
   - 쿼리 파라미터 유효성 검사 테스트
   - 오류 응답 포맷팅 테스트

#### 통합 테스트

1. **엔드투엔드 Excel 내보내기**
   - 다양한 날짜로 테스트 todos 생성
   - 날짜 범위로 내보내기 엔드포인트 호출
   - Excel 파일 구조 확인
   - 데이터 정확성 확인
   - 포맷팅이 올바르게 적용되었는지 확인

### 프론트엔드 테스트

#### 컴포넌트 테스트

1. **Excel 내보내기 버튼**
   - 버튼이 올바른 위치에 렌더링되는지 테스트
   - 버튼 스타일링 테스트 (outline-success)
   - 버튼 클릭이 모달을 트리거하는지 테스트

2. **날짜 범위 모달**
   - 모달이 날짜 선택기와 함께 표시되는지 테스트
   - 날짜 유효성 검사 로직 테스트
   - 취소 버튼 동작 테스트
   - 유효한 날짜로 확인 버튼 테스트

3. **파일 다운로드**
   - 성공적인 다운로드 흐름 테스트
   - 오류 처리 테스트
   - 파일 명명 규칙 테스트

#### 수동 테스트 체크리스트

- [ ] Excel 버튼이 올바른 위치에 나타남
- [ ] 모달이 날짜 선택기와 함께 열림
- [ ] 날짜 선택기가 모바일에서 수직으로 스택됨
- [ ] 유효성 검사가 잘못된 날짜 범위를 방지함
- [ ] 파일이 올바른 이름으로 다운로드됨
- [ ] Excel 파일이 Excel/LibreOffice에서 올바르게 열림
- [ ] 헤더가 올바르게 스타일링됨
- [ ] 열 너비가 적절함
- [ ] 데이터가 정확하고 완전함
- [ ] 삭제되지 않은 todos만 포함됨
- [ ] 날짜 범위 필터링이 올바르게 작동함
- [ ] 빈 결과가 적절한 메시지를 표시함

## 의존성

### 새로운 의존성

**백엔드:**
- `exceljs`: ^4.4.0 - Excel 파일 생성 라이브러리

**프론트엔드:**
- 새로운 의존성 불필요 (기존 SweetAlert2 및 date-fns 사용)

### 설치 명령어

```bash
# 백엔드
cd src
npm install exceljs

# 프론트엔드 - 변경 불필요
```

## 구현 참고사항

### 성능 고려사항

1. **대용량 데이터 세트**
   - Excel 생성은 동기식이며 대용량 데이터셋의 경우 블로킹될 수 있음
   - 페이지네이션 구현 또는 합리적인 날짜 범위로 내보내기 제한 고려
   - 권장 최대: 내보내기당 1000개의 todos

2. **메모리 사용**
   - Excel 버퍼가 전송 전에 메모리에 보관됨
   - 매우 큰 내보내기의 경우 스트리밍 접근 방식 고려

### 보안 고려사항

1. **인증**
   - 모든 내보내기 요청은 인증되어야 함
   - 사용자는 자신의 todos만 내보낼 수 있음

2. **입력 유효성 검사**
   - 주입 방지를 위한 날짜 형식 유효성 검사
   - 데이터베이스 쿼리 전에 날짜 파라미터 새니타이즈

3. **속도 제한**
   - 남용 방지를 위한 속도 제한 추가 고려
   - 제안: 사용자당 분당 10회 내보내기

### 접근성

1. **버튼 접근성**
   - Excel 버튼에 aria-label 추가
   - 키보드 탐색이 작동하는지 확인

2. **모달 접근성**
   - SweetAlert2가 포커스 관리 처리
   - 날짜 입력이 적절히 레이블링되었는지 확인

### 모바일 반응성

1. **버튼 레이아웃**
   - Excel 버튼이 작은 화면에서 적절히 스택되어야 함
   - 모바일에서 아이콘 전용 버튼 사용 고려

2. **모달 레이아웃**
   - 날짜 선택기가 모바일을 위해 수직으로 스택됨
   - 터치 친화적인 입력 크기 보장

## 설계 결정 및 근거

### 결정 1: exceljs 라이브러리 사용

**근거:** 
- 광범위한 포맷팅 기능을 갖춘 성숙하고 잘 유지관리되는 라이브러리
- 모든 필수 기능 지원 (스타일링, 열 너비, 테두리)
- 우수한 TypeScript 지원
- Excel 설치에 대한 외부 의존성 없음

**고려된 대안:**
- xlsx: 포맷팅 기능이 적음
- node-xlsx: 제한된 스타일링 옵션

### 결정 2: 쿼리 파라미터가 있는 GET 엔드포인트

**근거:**
- 읽기 전용 작업을 위한 RESTful 설계
- 쿼리 파라미터가 필터링 기준에 적합함
- 이 사용 사례에서 요청 본문이 있는 POST보다 간단함

**고려된 대안:**
- POST 엔드포인트: 읽기 작업에 불필요
- 별도의 날짜 범위 엔드포인트: 과도한 엔지니어링

### 결정 3: 날짜 선택을 위한 SweetAlert2

**근거:**
- 애플리케이션 전체에서 이미 사용됨
- 일관된 UX 제공
- 내장 유효성 검사 지원
- 모바일 친화적

**고려된 대안:**
- 커스텀 모달 컴포넌트: 더 많은 개발 노력
- 별도 페이지: 간단한 날짜 선택에 대한 나쁜 UX

### 결정 4: 클라이언트 측 파일 다운로드

**근거:**
- 표준 브라우저 다운로드 메커니즘
- 모든 브라우저에서 작동
- 추가 라이브러리 불필요

**고려된 대안:**
- 서버 측 리다이렉트: 오류 처리 복잡화
- FileSaver.js: 불필요한 의존성

### 결정 5: 연한 회색 헤더 배경

**근거:**
- 전문적인 외관
- 흰색 데이터 셀과 좋은 대비
- 비즈니스 문서에서 일반적으로 사용됨

**고려된 대안:**
- 파란색 헤더: 덜 전문적
- 스타일링 없음: 나쁜 시각적 계층 구조
