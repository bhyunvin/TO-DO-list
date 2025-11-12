# Implementation Plan

- [x] 1. Install exceljs dependency
  - Install exceljs package in the backend (src directory)
  - Verify installation by checking package.json
  - _Requirements: 1.1_

- [x] 2. Implement backend Excel export service method
  - [x] 2.1 Add exportToExcel method to TodoService
    - Create method signature accepting userSeq, startDate, and endDate parameters
    - Implement database query to fetch todos filtered by date range and del_yn = 'N'
    - Sort results by todoDate and todoSeq in ascending order
    - _Requirements: 1.3, 1.4, 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 2.2 Implement Excel workbook generation logic
    - Create new workbook and worksheet using exceljs
    - Configure column widths (A: 0, B: 4, C: 80, D: 15, E: 90)
    - Leave Column A and Row 1 empty as per specification
    - _Requirements: 2.1, 2.2, 2.6_
  
  - [x] 2.3 Add header row with styling
    - Set header text in cells B2:E2 (번호, 내용, 완료일시, 비고)
    - Apply light gray background fill (#D3D3D3) to header range
    - Apply borders to all sides of header cells
    - Apply bold font and center alignment to headers
    - _Requirements: 2.3, 2.4, 2.5_
  
  - [x] 2.4 Populate data rows
    - Iterate through filtered todos starting from Row 3
    - Map todo.seq to Column B
    - Map todo.todoContent to Column C
    - Map todo.completeDtm to Column D with format "YYYY-MM-DD HH:mm"
    - Map todo.todoNote to Column E
    - Handle null values for completeDtm and todoNote (display empty string)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 2.5 Generate and return Excel buffer
    - Write workbook to buffer
    - Return buffer for controller to send as response
    - _Requirements: 1.5_

- [x] 3. Implement backend Excel export controller endpoint
  - [x] 3.1 Add exportToExcel endpoint to TodoController
    - Create GET endpoint at /api/todo/excel
    - Apply AuthenticatedGuard for authentication
    - Extract startDate and endDate from query parameters
    - Extract userSeq from session
    - _Requirements: 1.1, 1.2_
  
  - [x] 3.2 Add input validation and error handling
    - Validate startDate and endDate are provided
    - Validate date format (YYYY-MM-DD)
    - Return 400 Bad Request for invalid inputs
    - Handle service errors and return 500 Internal Server Error
    - _Requirements: 1.1, 1.2_
  
  - [x] 3.3 Configure response headers and send file
    - Set Content-Type to 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    - Set Content-Disposition with filename pattern "todos_YYYY-MM-DD_to_YYYY-MM-DD.xlsx"
    - Send Excel buffer as response
    - _Requirements: 1.5_

- [x] 4. Implement frontend Excel export button
  - [x] 4.1 Add Excel export button to TodoContainer
    - Add button to todo-actions div, positioned left of "신규" button
    - Apply btn btn-outline-success styling
    - Set button text to "Excel" or "Excel 내보내기"
    - Add aria-label for accessibility
    - Show button only when not in create/edit/profile modes
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5. Implement frontend date range selection modal
  - [x] 5.1 Create date range modal function
    - Implement SweetAlert2 modal with two date input fields
    - Stack date pickers vertically for mobile compatibility
    - Set default values to current month's first and last day
    - Add labels for "시작일" (Start Date) and "종료일" (End Date)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 5.2 Add date validation logic
    - Validate both dates are selected
    - Validate startDate is not after endDate
    - Display inline validation messages in modal
    - Prevent modal confirmation if validation fails
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6. Implement frontend Excel export and download handler
  - [x] 6.1 Create handleExcelExport function
    - Trigger date range modal on button click
    - Call backend API with selected startDate and endDate as query parameters
    - Handle API response and convert to blob
    - _Requirements: 5.5, 5.6_
  
  - [x] 6.2 Implement file download logic
    - Create object URL from blob
    - Create temporary anchor element for download
    - Set download filename with date range pattern
    - Trigger download and cleanup resources
    - Display success message using SweetAlert
    - _Requirements: 5.5, 5.6_
  
  - [x] 6.3 Add error handling
    - Handle network errors with user-friendly messages
    - Handle API errors (400, 401, 500)
    - Display error messages using SweetAlert
    - _Requirements: 5.5, 5.6_

- [x] 7. Add backend unit tests
  - [x] 7.1 Write TodoService.exportToExcel tests
    - Test successful Excel generation with valid data
    - Test empty result set handling
    - Test date range filtering accuracy
    - Test del_yn = 'N' filtering
    - Test date formatting in Excel cells (YYYY-MM-DD HH:mm)
    - Test null value handling for completeDtm and todoNote
    - _Requirements: 1.3, 1.4, 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 7.2 Write TodoController.exportToExcel tests
    - Test successful response with correct headers
    - Test authentication guard enforcement
    - Test query parameter validation
    - Test error response formatting for invalid inputs
    - _Requirements: 1.1, 1.2, 1.5_

- [x] 8. Add frontend component tests
  - [x] 8.1 Test Excel export button rendering
    - Test button renders in correct position
    - Test button styling (btn-outline-success)
    - Test button visibility in different modes
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 8.2 Test date range modal functionality
    - Test modal displays with date pickers
    - Test date validation logic
    - Test cancel button behavior
    - Test confirm button with valid dates
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 8.3 Test file download handler
    - Test successful download flow
    - Test error handling for network failures
    - Test file naming convention
    - _Requirements: 5.5, 5.6_
