# Requirements Document

## Introduction

This feature enables users to export their todo items to an Excel (.xlsx) file format with customizable date range filtering. The export functionality provides a formatted spreadsheet with proper styling and layout that users can download and use for offline reference, reporting, or sharing purposes.

## Glossary

- **Todo System**: The existing todo management application that stores and manages user tasks
- **Excel Export API**: The backend REST endpoint that generates and returns Excel files
- **Date Range Filter**: User-specified start and end dates that limit which todos are included in the export
- **Export Button**: The frontend UI control that initiates the Excel export workflow
- **Date Selection Modal**: A popup dialog that allows users to specify the date range for export
- **Excel Workbook**: The generated .xlsx file containing formatted todo data

## Requirements

### Requirement 1: Excel Export API Endpoint

**User Story:** As a user, I want to request an Excel export of my todos via an API endpoint, so that I can programmatically retrieve my todo data in spreadsheet format

#### Acceptance Criteria

1. THE Todo System SHALL provide a GET endpoint at `/api/todo/excel` that generates Excel files
2. WHEN a user requests the Excel export endpoint, THE Todo System SHALL accept `startDate` and `endDate` as query parameters
3. WHEN generating the Excel file, THE Todo System SHALL filter todos WHERE `del_yn = 'N'`
4. WHEN the date range parameters are provided, THE Todo System SHALL include only todos within the specified date range
5. THE Todo System SHALL return the Excel file as a downloadable buffer with appropriate content-type headers

### Requirement 2: Excel File Structure and Formatting

**User Story:** As a user, I want the exported Excel file to have a clean, professional layout with proper formatting, so that the data is easy to read and use

#### Acceptance Criteria

1. THE Todo System SHALL create an Excel workbook with Column A left empty with width 4
2. THE Todo System SHALL create an Excel workbook with Row 1 left empty
3. THE Todo System SHALL place header labels in cells B2 through E2 with values "번호", "내용", "완료일시", and "비고" respectively
4. THE Todo System SHALL apply a light gray background fill to the header range B2:E2
5. THE Todo System SHALL apply borders to all sides of cells in the header range B2:E2
6. THE Todo System SHALL set column widths as follows: Column A to 4, Column B to 6, Column C to 80, Column D to 17, and Column E to 90
7. THE Todo System SHALL set row height to 15 for Row 1, Row 2, and all data rows containing todo items

### Requirement 3: Excel Data Population

**User Story:** As a user, I want my todo data to be accurately populated in the Excel file with proper formatting, so that I can review and analyze my tasks offline

#### Acceptance Criteria

1. THE Todo System SHALL populate todo data starting from Row 3
2. THE Todo System SHALL map `todo.seq` to Column B for each todo item
3. THE Todo System SHALL map `todo.todo_content` to Column C for each todo item
4. THE Todo System SHALL map `todo.complete_dtm` to Column D formatted as "YYYY-MM-DD HH:mm" for each todo item
5. THE Todo System SHALL map `todo.todo_note` to Column E for each todo item

### Requirement 4: Excel Export Button UI

**User Story:** As a user, I want a clearly visible Excel export button in the todo interface, so that I can easily initiate the export process

#### Acceptance Criteria

1. THE Todo System SHALL display an Excel export button in the upper-right area of the todo page
2. THE Todo System SHALL position the Excel export button to the left of the existing "New" button
3. THE Todo System SHALL style the Excel export button with a green outline appearance without background fill
4. WHEN a user views the todo page, THE Todo System SHALL ensure the Excel export button is visible and accessible

### Requirement 5: Date Range Selection Modal

**User Story:** As a user, I want to select a custom date range before exporting, so that I can control which todos are included in the Excel file

#### Acceptance Criteria

1. WHEN a user clicks the Excel export button, THE Todo System SHALL display a modal dialog with date selection controls
2. THE Todo System SHALL provide a start date picker control within the modal
3. THE Todo System SHALL provide an end date picker control within the modal
4. THE Todo System SHALL arrange the start date and end date pickers vertically for mobile compatibility
5. WHEN a user confirms the date selection, THE Todo System SHALL call the Excel export API with the selected startDate and endDate parameters
6. WHEN the API response is received, THE Todo System SHALL trigger a file download of the Excel workbook
