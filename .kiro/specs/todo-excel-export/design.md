# Design Document

## Overview

This feature adds Excel export functionality to the existing Todo application, allowing users to export their todo items within a specified date range to a professionally formatted .xlsx file. The implementation follows the existing NestJS backend and React frontend architecture patterns, integrating seamlessly with the current todo management system.

## Architecture

### Backend Architecture

The Excel export functionality will be implemented as a new endpoint in the existing `TodoController` and a new method in the `TodoService`. The implementation will use the `exceljs` library to generate Excel files with custom formatting.

**Component Flow:**
```
Client Request → TodoController.exportToExcel() → TodoService.exportToExcel() → ExcelJS → Response (Buffer)
```

### Frontend Architecture

The frontend will add a new Excel export button to the TodoContainer component's action bar. When clicked, it will display a SweetAlert2 modal with date range pickers, then trigger the API call and file download.

**Component Flow:**
```
Excel Button Click → SweetAlert Modal → Date Selection → API Call → File Download
```

## Components and Interfaces

### Backend Components

#### 1. TodoController Enhancement

**New Endpoint:**
- **Route:** `GET /api/todo/excel`
- **Query Parameters:**
  - `startDate`: string (format: YYYY-MM-DD)
  - `endDate`: string (format: YYYY-MM-DD)
- **Response:** Excel file buffer with appropriate headers
- **Authentication:** Protected by `AuthenticatedGuard`

**Response Headers:**
```typescript
{
  'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'Content-Disposition': 'attachment; filename="todos_YYYY-MM-DD_to_YYYY-MM-DD.xlsx"'
}
```

#### 2. TodoService Enhancement

**New Method:**
```typescript
async exportToExcel(
  userSeq: number,
  startDate: string,
  endDate: string
): Promise<Buffer>
```

**Responsibilities:**
- Query todos within date range where `del_yn = 'N'`
- Generate Excel workbook using exceljs
- Apply formatting and styling
- Return buffer for download

#### 3. Excel Generation Logic

**Workbook Structure:**
- Single worksheet named "Todos"
- Column A: Empty (reserved)
- Row 1: Empty (reserved)
- Row 2: Headers with styling
- Row 3+: Data rows

**Column Configuration:**
```typescript
{
  A: { width: 4 },      // Empty (visible but no content)
  B: { width: 6 },      // 번호 (No.)
  C: { width: 80 },     // 내용 (Content)
  D: { width: 17 },     // 완료일시 (Completion DateTime)
  E: { width: 90 }      // 비고 (Note)
}
```

**Row Configuration:**
```typescript
{
  Row 1: { height: 15 },     // Empty row
  Row 2: { height: 15 },     // Header row
  Row 3+: { height: 15 }     // Data rows (for each todo item)
}
```

**Header Styling:**
- Background: Light gray (#D3D3D3)
- Borders: All sides, thin style
- Font: Bold
- Alignment: Center

### Frontend Components

#### 1. TodoContainer Enhancement

**New UI Elements:**
- Excel export button positioned left of "신규" button
- Button styling: `btn btn-outline-success`
- Button text: "Excel" or "Excel 내보내기"

#### 2. Date Range Selection Modal

**Implementation using SweetAlert2:**
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

**Modal Features:**
- Vertical stacking of date pickers for mobile compatibility
- Validation for required fields
- Validation for logical date range
- Default values: Current month's first and last day

#### 3. File Download Handler

**Implementation:**
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

## Data Models

### Query Filter

The backend will query todos using the following criteria:

```typescript
{
  userSeq: number,
  todoDate: Between(startDate, endDate),
  delYn: 'N'
}
```

**Sort Order:**
- Primary: `todoDate` ASC
- Secondary: `todoSeq` ASC

### Excel Data Mapping

Each todo row will be mapped as follows:

| Column | Field | Format | Example |
|--------|-------|--------|---------|
| B | `todo.todoSeq` | Number | 1 |
| C | `todo.todoContent` | Text | "프로젝트 문서 작성" |
| D | `todo.completeDtm` | YYYY-MM-DD HH:mm | "2024-11-12 14:30" |
| E | `todo.todoNote` | Text | "긴급 처리 필요" |

**Null Handling:**
- `completeDtm`: Display empty string if null
- `todoNote`: Display empty string if null

## Error Handling

### Backend Error Scenarios

1. **Invalid Date Format**
   - Status: 400 Bad Request
   - Message: "Invalid date format. Use YYYY-MM-DD"

2. **Missing Parameters**
   - Status: 400 Bad Request
   - Message: "startDate and endDate are required"

3. **Unauthorized Access**
   - Status: 401 Unauthorized
   - Message: "Authentication required"

4. **Excel Generation Failure**
   - Status: 500 Internal Server Error
   - Message: "Failed to generate Excel file"
   - Log error details for debugging

### Frontend Error Scenarios

1. **Network Error**
   - Display: SweetAlert error modal
   - Message: "서버와의 통신 중 문제가 발생했습니다."

2. **Invalid Date Selection**
   - Display: Inline validation message in modal
   - Message: "시작일은 종료일보다 이전이어야 합니다"

3. **Empty Date Fields**
   - Display: Inline validation message in modal
   - Message: "날짜를 선택해주세요"

4. **Download Failure**
   - Display: SweetAlert error modal
   - Message: "Excel 내보내기에 실패했습니다."

## Testing Strategy

### Backend Testing

#### Unit Tests

1. **TodoService.exportToExcel()**
   - Test successful Excel generation with valid data
   - Test empty result set handling
   - Test date range filtering
   - Test del_yn filtering
   - Test date formatting in Excel cells
   - Test column width configuration
   - Test header styling application

2. **TodoController.exportToExcel()**
   - Test successful response with correct headers
   - Test authentication guard enforcement
   - Test query parameter validation
   - Test error response formatting

#### Integration Tests

1. **End-to-End Excel Export**
   - Create test todos with various dates
   - Call export endpoint with date range
   - Verify Excel file structure
   - Verify data accuracy
   - Verify formatting applied correctly

### Frontend Testing

#### Component Tests

1. **Excel Export Button**
   - Test button renders in correct position
   - Test button styling (outline-success)
   - Test button click triggers modal

2. **Date Range Modal**
   - Test modal displays with date pickers
   - Test date validation logic
   - Test cancel button behavior
   - Test confirm button with valid dates

3. **File Download**
   - Test successful download flow
   - Test error handling
   - Test file naming convention

#### Manual Testing Checklist

- [ ] Excel button appears in correct position
- [ ] Modal opens with date pickers
- [ ] Date pickers are vertically stacked on mobile
- [ ] Validation prevents invalid date ranges
- [ ] File downloads with correct name
- [ ] Excel file opens correctly in Excel/LibreOffice
- [ ] Headers are styled correctly
- [ ] Column widths are appropriate
- [ ] Data is accurate and complete
- [ ] Only non-deleted todos are included
- [ ] Date range filtering works correctly
- [ ] Empty result shows appropriate message

## Dependencies

### New Dependencies

**Backend:**
- `exceljs`: ^4.4.0 - Excel file generation library

**Frontend:**
- No new dependencies required (uses existing SweetAlert2 and date-fns)

### Installation Commands

```bash
# Backend
cd src
npm install exceljs

# Frontend - no changes needed
```

## Implementation Notes

### Performance Considerations

1. **Large Data Sets**
   - Excel generation is synchronous and may block for large datasets
   - Consider implementing pagination or limiting export to reasonable date ranges
   - Recommended max: 1000 todos per export

2. **Memory Usage**
   - Excel buffer is held in memory before sending
   - For very large exports, consider streaming approach

### Security Considerations

1. **Authentication**
   - All export requests must be authenticated
   - Users can only export their own todos

2. **Input Validation**
   - Validate date format to prevent injection
   - Sanitize date parameters before database query

3. **Rate Limiting**
   - Consider adding rate limiting to prevent abuse
   - Suggested: 10 exports per minute per user

### Accessibility

1. **Button Accessibility**
   - Add aria-label to Excel button
   - Ensure keyboard navigation works

2. **Modal Accessibility**
   - SweetAlert2 handles focus management
   - Ensure date inputs are properly labeled

### Mobile Responsiveness

1. **Button Layout**
   - Excel button should stack appropriately on small screens
   - Consider using icon-only button on mobile

2. **Modal Layout**
   - Date pickers are vertically stacked for mobile
   - Ensure touch-friendly input sizes

## Design Decisions and Rationales

### Decision 1: Use exceljs Library

**Rationale:** 
- Mature, well-maintained library with extensive formatting capabilities
- Supports all required features (styling, column widths, borders)
- Good TypeScript support
- No external dependencies on Excel installation

**Alternatives Considered:**
- xlsx: Less formatting capabilities
- node-xlsx: Limited styling options

### Decision 2: GET Endpoint with Query Parameters

**Rationale:**
- RESTful design for read-only operation
- Query parameters are appropriate for filtering criteria
- Simpler than POST with request body for this use case

**Alternatives Considered:**
- POST endpoint: Unnecessary for read operation
- Separate date range endpoint: Over-engineering

### Decision 3: SweetAlert2 for Date Selection

**Rationale:**
- Already used throughout the application
- Provides consistent UX
- Built-in validation support
- Mobile-friendly

**Alternatives Considered:**
- Custom modal component: More development effort
- Separate page: Poor UX for simple date selection

### Decision 4: Client-Side File Download

**Rationale:**
- Standard browser download mechanism
- Works across all browsers
- No additional libraries needed

**Alternatives Considered:**
- Server-side redirect: Complicates error handling
- FileSaver.js: Unnecessary dependency

### Decision 5: Light Gray Header Background

**Rationale:**
- Professional appearance
- Good contrast with white data cells
- Commonly used in business documents

**Alternatives Considered:**
- Blue header: Less professional
- No styling: Poor visual hierarchy
