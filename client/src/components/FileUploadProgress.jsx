import PropTypes from 'prop-types';
import { ProgressBar, Alert, Badge, ListGroup } from 'react-bootstrap';
import { useFileUploadValidator } from '../hooks/useFileUploadValidator';

/**
 * 파일 업로드 진행 상황 및 상태 컴포넌트
 */
const FileUploadProgress = ({
  files = [],
  validationResults = [],
  uploadProgress = {},
  uploadStatus = 'idle', // 'idle', 'validating', 'uploading', 'success', 'error', 'partial_success'
  uploadErrors = [],
  uploadedFiles = [],
  onRemoveFile,
  onRetryUpload,
  showValidation = true,
  showProgress = true,
  showDetailedStatus = false,
  compact = false, // 간결한 표시를 위한 새 prop
}) => {
  const { formatFileSize, getUserFriendlyMessage } = useFileUploadValidator();

  /**
   * Bootstrap 컴포넌트를 위한 상태 variant 가져오기
   */
  const getStatusVariant = (status) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'partial_success':
        return 'warning';
      case 'error':
        return 'danger';
      case 'validating':
      case 'uploading':
        return 'primary';
      default:
        return 'secondary';
    }
  };

  /**
   * 개별 파일 업로드 상태 가져오기
   */
  const getFileUploadStatus = (file) => {
    const fileName = file.name;

    // 파일이 성공적으로 업로드되었는지 확인
    const wasUploaded = uploadedFiles.some(
      (uploaded) =>
        uploaded.originalFileName === fileName ||
        uploaded.fileName === fileName,
    );

    // 파일에 업로드 오류가 있는지 확인
    const hasError = uploadErrors.some((error) => error.fileName === fileName);

    if (wasUploaded) {
      return { status: 'success', message: '업로드 완료' };
    } else if (hasError) {
      return { status: 'error', message: '업로드 실패' };
    } else if (uploadStatus === 'uploading') {
      return { status: 'uploading', message: '업로드 중...' };
    } else if (
      uploadStatus === 'success' ||
      uploadStatus === 'partial_success'
    ) {
      return { status: 'pending', message: '대기 중' };
    }

    return { status: 'idle', message: '' };
  };

  /**
   * 파일 유효성 검사 상태 가져오기
   */
  const getFileValidationStatus = (file, index) => {
    const result = validationResults[index];
    if (!result) return { isValid: true, message: '' };

    return {
      isValid: result.isValid,
      message: result.isValid ? 'Valid' : getUserFriendlyMessage(result),
    };
  };

  /**
   * 파일 업로드 진행률 가져오기
   */
  const getFileProgress = (fileName) => {
    return uploadProgress[fileName] || 0;
  };

  /**
   * 파일 유효성 검사 상태 배지 렌더링
   */

  /**
   * 향상된 시각적 피드백 및 실시간 상태와 함께 파일 진행률 표시줄 렌더링
   */
  const renderProgressBar = (file) => {
    const progress = getFileProgress(file.name);
    const fileStatus = getFileUploadStatus(file);
    let variant = 'primary';
    let label = '';
    let showLabel = false;
    let statusIcon = '';

    if (progress === 100 || fileStatus.status === 'success') {
      variant = 'success';
      label = '완료';
      statusIcon = 'bi-check-circle-fill';
      showLabel = true;
    } else if (fileStatus.status === 'error' || uploadStatus === 'error') {
      variant = 'danger';
      label = '실패';
      statusIcon = 'bi-x-circle-fill';
      showLabel = true;
    } else if (uploadStatus === 'uploading') {
      label = `${progress}%`;
      statusIcon = 'bi-cloud-upload';
      showLabel = progress > 0;
    } else if (uploadStatus === 'validating') {
      variant = 'info';
      label = '검증 중';
      statusIcon = 'bi-hourglass-split';
      showLabel = true;
    }

    return (
      <div className="mt-2">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <small className="text-muted">
            <i className={`bi ${statusIcon} me-1`}></i> 업로드 상태
          </small>
          {showLabel && (
            <small
              className={`text-${
                variant === 'success' ||
                variant === 'danger' ||
                variant === 'info'
                  ? variant
                  : 'primary'
              } fw-bold`}
            >
              {label}
            </small>
          )}
        </div>
        <ProgressBar
          now={progress}
          variant={variant}
          style={{ height: '8px' }}
          animated={
            uploadStatus === 'uploading' && progress > 0 && progress < 100
          }
          striped={uploadStatus === 'validating'}
        />

        {/* 상세 정보가 포함된 향상된 업로드 피드백 */}
        {uploadStatus === 'uploading' && progress > 0 && progress < 100 && (
          <div className="mt-1 d-flex justify-content-between align-items-center">
            <small className="text-primary">
              <i className="bi bi-cloud-upload me-1"></i>
              업로드 중... {formatFileSize(file.size)}
            </small>
            <small className="text-muted">
              {progress > 0 && (
                <>
                  <i className="bi bi-speedometer2 me-1"></i>
                  {Math.round((file.size * progress) / 100 / 1024)} KB 전송됨
                </>
              )}
            </small>
          </div>
        )}

        {/* 유효성 검사 피드백 */}
        {uploadStatus === 'validating' && (
          <div className="mt-1">
            <small className="text-info">
              <i className="bi bi-shield-check me-1"></i> 파일 보안 검사 및
              유효성 검증 중...
            </small>
          </div>
        )}

        {/* 타임스탬프가 포함된 성공 피드백 */}
        {fileStatus.status === 'success' && (
          <div className="mt-1">
            <small className="text-success">
              <i className="bi bi-check-circle-fill me-1"></i>
              <strong>업로드 완료!</strong> -{' '}
              {new Date().toLocaleTimeString('ko-KR')}
            </small>
          </div>
        )}

        {/* 재시도 제안이 포함된 오류 피드백 */}
        {fileStatus.status === 'error' && (
          <div className="mt-1">
            <small className="text-danger">
              <i className="bi bi-exclamation-triangle-fill me-1"></i>
              <strong>업로드 실패</strong> - 파일을 다시 선택하거나
              재시도해주세요.
            </small>
          </div>
        )}

        {/* 대기 상태 */}
        {uploadStatus === 'uploading' && progress === 0 && (
          <div className="mt-1">
            <small className="text-muted">
              <i className="bi bi-hourglass me-1"></i>
              업로드 대기 중... ({formatFileSize(file.size)})
            </small>
          </div>
        )}
      </div>
    );
  };

  /**
   * 전체 업로드 진행률 계산
   */
  const calculateOverallProgress = () => {
    if (files.length === 0) return 0;

    const totalProgress = files.reduce((sum, file) => {
      return sum + (uploadProgress[file.name] || 0);
    }, 0);

    return Math.round(totalProgress / files.length);
  };

  /**
   * 향상된 피드백과 함께 전체 업로드 상태 렌더링
   */
  const renderUploadStatus = () => {
    if (uploadStatus === 'idle') return null;

    const statusMessages = {
      validating: '파일 검증 중...',
      uploading: '파일 업로드 중...',
      success: '업로드가 성공적으로 완료되었습니다!',
      partial_success:
        '일부 파일이 업로드되었습니다. 실패한 파일을 확인해주세요.',
      error: '업로드에 실패했습니다. 아래 오류를 확인해주세요.',
    };

    const variant = getStatusVariant(uploadStatus);
    const message = statusMessages[uploadStatus] || '';

    // 상세 상태를 위한 업로드 통계 계산
    const totalFiles = files.length;
    const successfulUploads = uploadedFiles.length;
    const failedUploads = uploadErrors.length;
    const overallProgress = calculateOverallProgress();

    // 활성 업로드를 위한 업로드 속도 및 예상 시간 계산
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const uploadedSize = uploadedFiles.reduce(
      (sum, file) => sum + (file.fileSize || 0),
      0,
    );
    const remainingSize = totalSize - uploadedSize;

    return (
      <Alert variant={variant} className="mb-3">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center flex-grow-1">
            {(uploadStatus === 'validating' ||
              uploadStatus === 'uploading') && (
              <output
                className="spinner-border spinner-border-sm me-2"
                aria-label="Loading..."
              >
                <span className="visually-hidden">Loading...</span>
              </output>
            )}
            <div className="flex-grow-1">
              <div className="d-flex align-items-center">
                <strong>{message}</strong>
                {uploadStatus === 'uploading' && (
                  <small className="text-muted ms-2">
                    ({formatFileSize(uploadedSize)} /{' '}
                    {formatFileSize(totalSize)})
                  </small>
                )}
              </div>

              {/* 업로드 상태를 위한 향상된 전체 진행률 표시줄 */}
              {uploadStatus === 'uploading' && (
                <div className="mt-2">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <small className="text-muted">
                      <i className="bi bi-cloud-upload me-1"></i> 전체 진행률
                    </small>
                    <small className="text-primary font-weight-bold">
                      {overallProgress}%
                    </small>
                  </div>
                  <ProgressBar
                    now={overallProgress}
                    variant="primary"
                    style={{ height: '8px' }}
                    animated
                  />
                  {/* 업로드 통계 */}
                  <div className="mt-1 d-flex justify-content-between">
                    <small className="text-muted">
                      <i className="bi bi-files me-1"></i>
                      {successfulUploads}/{totalFiles} 파일 완료
                    </small>
                    {remainingSize > 0 && (
                      <small className="text-muted">
                        <i className="bi bi-hourglass-split me-1"></i>
                        남은 용량: {formatFileSize(remainingSize)}
                      </small>
                    )}
                  </div>
                </div>
              )}

              {/* 파일 요약이 포함된 향상된 성공 세부 정보 */}
              {uploadStatus === 'success' && showDetailedStatus && (
                <div className="mt-2 p-2 bg-light rounded">
                  <div className="text-success mb-2">
                    <i className="bi bi-check-circle-fill me-1"></i>
                    <strong>
                      {successfulUploads}개 파일이 성공적으로 업로드되었습니다!
                    </strong>
                  </div>
                  <div className="row text-muted small">
                    <div className="col-6">
                      <i className="bi bi-clock me-1"></i>
                      완료 시간: {new Date().toLocaleTimeString('ko-KR')}
                    </div>
                    <div className="col-6">
                      <i className="bi bi-hdd me-1"></i>총 용량:{' '}
                      {formatFileSize(totalSize)}
                    </div>
                  </div>
                  {/* 업로드된 파일 이름 표시 */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-2">
                      <small className="text-muted">업로드된 파일:</small>
                      <ul className="list-unstyled mb-0 mt-1">
                        {uploadedFiles.slice(0, 3).map((file) => (
                          <li
                            key={file.originalFileName || file.fileName}
                            className="small text-success"
                          >
                            <i className="bi bi-file-earmark-check me-1"></i>
                            {file.originalFileName || file.fileName}
                          </li>
                        ))}
                        {uploadedFiles.length > 3 && (
                          <li className="small text-muted">
                            ... 외 {uploadedFiles.length - 3}개 파일
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* 향상된 부분 성공 세부 정보 */}
              {uploadStatus === 'partial_success' && showDetailedStatus && (
                <div className="mt-2 p-2 bg-light rounded">
                  <div className="row">
                    <div className="col-6">
                      <div className="text-success small">
                        <i className="bi bi-check-circle-fill me-1"></i>
                        성공: {successfulUploads}개
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="text-danger small">
                        <i className="bi bi-x-circle-fill me-1"></i>
                        실패: {failedUploads}개
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 small text-muted">
                    <i className="bi bi-info-circle me-1"></i> 성공한 파일은
                    저장되었습니다. 실패한 파일만 다시 업로드하세요.
                  </div>
                </div>
              )}
            </div>
          </div>

          {showDetailedStatus &&
            (uploadStatus === 'success' ||
              uploadStatus === 'partial_success' ||
              uploadStatus === 'error') && (
              <div className="text-end ms-3">
                <div className="d-flex flex-column align-items-end">
                  {uploadStatus === 'success' && (
                    <Badge bg="success" className="mb-1">
                      <i className="bi bi-check-circle-fill me-1"></i>
                      {successfulUploads}/{totalFiles} 완료
                    </Badge>
                  )}
                  {uploadStatus === 'partial_success' && (
                    <>
                      <Badge bg="success" className="mb-1">
                        <i className="bi bi-check-circle-fill me-1"></i>
                        성공: {successfulUploads}
                      </Badge>
                      <Badge bg="warning">
                        <i className="bi bi-exclamation-triangle-fill me-1"></i>
                        실패: {failedUploads}
                      </Badge>
                    </>
                  )}
                  {uploadStatus === 'error' && (
                    <Badge bg="danger">
                      <i className="bi bi-x-circle-fill me-1"></i>
                      {failedUploads}/{totalFiles} 실패
                    </Badge>
                  )}
                </div>
              </div>
            )}
        </div>

        {/* 부분 실패를 위한 향상된 재시도 섹션 */}
        {uploadStatus === 'partial_success' &&
          onRetryUpload &&
          failedUploads > 0 && (
            <div className="mt-3 pt-2 border-top">
              <div className="d-flex justify-content-between align-items-center">
                <div className="flex-grow-1">
                  <small className="text-warning">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    <strong>
                      {failedUploads}개 파일 업로드에 실패했습니다.
                    </strong>
                  </small>
                  <div className="mt-1">
                    <small className="text-muted">
                      성공한 파일은 이미 저장되었으므로 실패한 파일만 다시
                      업로드됩니다.
                    </small>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-warning ms-3"
                  onClick={() => {
                    const failedFileNameList = new Set(
                      uploadErrors.map((e) => e.fileName),
                    );
                    const failedFiles = files.filter((file) =>
                      failedFileNameList.has(file.name),
                    );
                    onRetryUpload(failedFiles);
                  }}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  실패한 파일 재시도 ({failedUploads}개)
                </button>
              </div>
            </div>
          )}

        {/* 문제 해결 팁이 포함된 향상된 오류 섹션 */}
        {uploadStatus === 'error' && failedUploads > 0 && (
          <div className="mt-3 pt-2 border-top">
            <div className="text-danger mb-2">
              <i className="bi bi-exclamation-triangle-fill me-1"></i>
              <strong>모든 파일 업로드에 실패했습니다.</strong>
            </div>
            <div className="small text-muted">
              <div className="mb-1">다음 사항을 확인해주세요:</div>
              <ul className="mb-2">
                <li>네트워크 연결 상태</li>
                <li>파일 크기 및 형식 제한</li>
                <li>서버 연결 상태</li>
              </ul>
            </div>
            {onRetryUpload && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => onRetryUpload(files)}
              >
                <i className="bi bi-arrow-clockwise me-1"></i> 모든 파일 다시
                시도
              </button>
            )}
          </div>
        )}
      </Alert>
    );
  };

  /**
   * 업로드 오류 렌더링
   */
  const renderUploadErrors = () => {
    if (uploadErrors.length === 0) return null;

    return (
      <Alert variant="danger" className="mb-3">
        <Alert.Heading>업로드 오류</Alert.Heading>
        <ul className="mb-0">
          {uploadErrors.map((error) => (
            <li key={error.fileName}>
              <strong>{error.fileName}:</strong> {getUserFriendlyMessage(error)}
            </li>
          ))}
        </ul>
      </Alert>
    );
  };

  /**
   * 개별 파일 항목 렌더링
   */
  const renderFileItem = (file, index) => {
    const validationStatus = getFileValidationStatus(file, index);
    const uploadFileStatus = getFileUploadStatus(file);

    const hasValidationError = !validationStatus.isValid;
    const hasUploadError = uploadFileStatus.status === 'error';
    const isSuccess = uploadFileStatus.status === 'success';
    const isUploading = uploadFileStatus.status === 'uploading';

    let borderClass = '';
    if (hasValidationError || hasUploadError) {
      borderClass = 'border-danger';
    } else if (isSuccess) {
      borderClass = 'border-success';
    } else if (isUploading) {
      borderClass = 'border-primary';
    }

    const getFileIconClass = () => {
      if (file.type?.startsWith('image/')) return 'bi-file-earmark-image';
      if (file.type?.includes('pdf')) return 'bi-file-earmark-pdf';
      if (file.type?.includes('word') || file.name?.endsWith('.docx')) {
        return 'bi-file-earmark-word';
      }
      if (file.type?.includes('excel') || file.name?.endsWith('.xlsx')) {
        return 'bi-file-earmark-excel';
      }
      if (file.type?.includes('powerpoint') || file.name?.endsWith('.pptx')) {
        return 'bi-file-earmark-ppt';
      }
      return 'bi-file-earmark-text';
    };

    const getBadgeVariant = (status) => {
      switch (status) {
        case 'success':
          return 'success';
        case 'error':
          return 'danger';
        case 'uploading':
          return 'primary';
        default:
          return 'secondary';
      }
    };

    return (
      <ListGroup.Item
        key={file.name || index}
        className={`d-flex justify-content-between align-items-start ${borderClass}`}
      >
        <div className="flex-grow-1">
          <div className="d-flex align-items-center flex-wrap">
            {/* 유형에 따른 파일 아이콘 */}
            <i className={`bi ${getFileIconClass()} me-2 text-muted`}></i>

            <div className="flex-grow-1">
              <div className="d-flex align-items-center">
                <strong className={hasValidationError ? 'text-danger' : ''}>
                  {file.name}
                </strong>
                <span className="text-muted ms-2">
                  ({formatFileSize(file.size)})
                </span>
              </div>

              {/* 파일 유형 및 마지막 수정 정보 */}
              <div className="small text-muted mt-1">
                <i className="bi bi-info-circle me-1"></i>
                타입: {file.type || 'Unknown'}
                {file.lastModified && (
                  <>
                    {' | '}
                    <i className="bi bi-calendar3 me-1"></i>
                    수정:{' '}
                    {new Date(file.lastModified).toLocaleDateString('ko-KR')}
                  </>
                )}
              </div>
            </div>

            <div className="d-flex align-items-center ms-2">
              {/* 향상된 유효성 검사 상태 배지 */}
              {showValidation && (
                <div className="me-2">
                  {validationStatus.isValid ? (
                    <Badge bg="success" className="d-flex align-items-center">
                      <i className="bi bi-shield-check me-1"></i> 검증 완료
                    </Badge>
                  ) : (
                    <Badge bg="danger" className="d-flex align-items-center">
                      <i className="bi bi-shield-x me-1"></i> 검증 실패
                    </Badge>
                  )}
                </div>
              )}

              {/* 향상된 업로드 상태 배지 */}
              {uploadStatus !== 'idle' && uploadStatus !== 'validating' && (
                <div className="me-2">
                  <Badge
                    bg={getBadgeVariant(uploadFileStatus.status)}
                    className="d-flex align-items-center"
                  >
                    {uploadFileStatus.status === 'success' && (
                      <>
                        <i className="bi bi-check-circle-fill me-1"></i> 업로드
                        완료
                      </>
                    )}
                    {uploadFileStatus.status === 'error' && (
                      <>
                        <i className="bi bi-x-circle-fill me-1"></i> 업로드 실패
                      </>
                    )}
                    {uploadFileStatus.status === 'uploading' && (
                      <>
                        <output
                          className="spinner-border spinner-border-sm me-1"
                          aria-label="Loading..."
                        >
                          <span className="visually-hidden">Loading...</span>
                        </output>
                        업로드 중
                      </>
                    )}
                    {uploadFileStatus.status === 'pending' && (
                      <>
                        <i className="bi bi-hourglass me-1"></i> 대기 중
                      </>
                    )}
                  </Badge>
                </div>
              )}

              {/* 제거 버튼 */}
              {onRemoveFile && uploadStatus !== 'uploading' && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => onRemoveFile(index)}
                  title="파일 제거"
                  disabled={uploadFileStatus.status === 'success'}
                >
                  <i className="bi bi-trash"></i>
                </button>
              )}
            </div>
          </div>

          {/* 제안이 포함된 향상된 유효성 검사 오류 메시지 */}
          {!validationStatus.isValid && (
            <div className="alert alert-danger small mt-2 mb-0 py-2">
              <i className="bi bi-exclamation-triangle-fill me-1"></i>
              <strong>검증 오류:</strong> {validationStatus.message}
              <div className="mt-1 text-muted">
                파일을 다시 선택하거나 파일 형식과 크기를 확인해주세요.
              </div>
            </div>
          )}

          {/* 재시도 옵션이 포함된 향상된 업로드 오류 메시지 */}
          {uploadFileStatus.status === 'error' && (
            <div className="alert alert-danger small mt-2 mb-0 py-2">
              <i className="bi bi-exclamation-triangle-fill me-1"></i>
              <strong>업로드 오류:</strong>{' '}
              {uploadErrors.find((error) => error.fileName === file.name)
                ?.errorMessage || '업로드에 실패했습니다.'}
              <div className="mt-1 text-muted">
                네트워크 연결을 확인하거나 잠시 후 다시 시도해주세요.
              </div>
            </div>
          )}

          {/* 상세 정보가 포함된 향상된 성공 메시지 */}
          {uploadFileStatus.status === 'success' && showDetailedStatus && (
            <div className="alert alert-success small mt-2 mb-0 py-2">
              <i className="bi bi-check-circle-fill me-1"></i>
              <strong>업로드 성공!</strong>
              <div className="row mt-1 text-muted">
                <div className="col-6">
                  <i className="bi bi-clock me-1"></i>
                  완료: {new Date().toLocaleTimeString('ko-KR')}
                </div>
                <div className="col-6">
                  <i className="bi bi-hdd me-1"></i>
                  크기: {formatFileSize(file.size)}
                </div>
              </div>
              {/* 사용 가능한 경우 서버 파일 정보 표시 */}
              {uploadedFiles.find(
                (uploaded) =>
                  uploaded.originalFileName === file.name ||
                  uploaded.fileName === file.name,
              ) && (
                <div className="mt-1 text-muted">
                  <i className="bi bi-server me-1"></i> 서버에 안전하게
                  저장되었습니다.
                </div>
              )}
            </div>
          )}

          {/* 활성 업로드를 위한 향상된 업로드 상태 */}
          {uploadFileStatus.status === 'uploading' && (
            <div className="alert alert-primary small mt-2 mb-0 py-2">
              <div className="d-flex align-items-center">
                <output
                  className="spinner-border spinner-border-sm me-2"
                  aria-label="Loading..."
                >
                  <span className="visually-hidden">Loading...</span>
                </output>
                <div className="flex-grow-1">
                  <strong>업로드 진행 중...</strong>
                  <div className="text-muted">
                    파일 크기: {formatFileSize(file.size)} | 진행률:{' '}
                    {getFileProgress(file.name)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 대기 상태 */}
          {uploadFileStatus.status === 'pending' &&
            uploadStatus === 'uploading' && (
              <div className="alert alert-info small mt-2 mb-0 py-2">
                <i className="bi bi-hourglass me-1"></i>
                <strong>업로드 대기 중...</strong>
                <div className="text-muted">
                  다른 파일 업로드가 완료되면 자동으로 시작됩니다.
                </div>
              </div>
            )}

          {/* 향상된 진행률 표시줄 */}
          {showProgress &&
            (uploadStatus === 'uploading' || uploadStatus === 'validating') &&
            validationStatus.isValid &&
            renderProgressBar(file)}
        </div>
      </ListGroup.Item>
    );
  };

  /**
   * 향상된 상태 및 유효성 검사 피드백과 함께 파일 목록 렌더링
   */
  const renderFileList = () => {
    if (files.length === 0) return null;

    return <ListGroup className="mb-3">{files.map(renderFileItem)}</ListGroup>;
  };

  /**
   * 간결한 진행 상황 요약 렌더링
   */
  const renderCompactSummary = () => {
    if (files.length === 0) return null;

    const totalFiles = files.length;
    const successfulUploads = uploadedFiles.length;
    const failedUploads = uploadErrors.length;
    const overallProgress = calculateOverallProgress();

    return (
      <div className="compact-upload-summary p-2 border rounded">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <small className="text-muted">
            파일 업로드 ({successfulUploads}/{totalFiles})
          </small>
          <small className={`text-${getStatusVariant(uploadStatus)}`}>
            {uploadStatus === 'success' && '완료'}
            {uploadStatus === 'uploading' && `${overallProgress}%`}
            {uploadStatus === 'error' && '실패'}
            {uploadStatus === 'partial_success' && '부분 완료'}
          </small>
        </div>

        {uploadStatus === 'uploading' && (
          <ProgressBar
            now={overallProgress}
            variant="primary"
            style={{ height: '4px' }}
            animated
          />
        )}

        {(uploadStatus === 'error' || uploadStatus === 'partial_success') &&
          failedUploads > 0 &&
          onRetryUpload && (
            <div className="mt-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => {
                  const failedFileNameList = new Set(
                    uploadErrors.map((e) => e.fileName),
                  );
                  const failedFiles = files.filter((file) =>
                    failedFileNameList.has(file.name),
                  );
                  onRetryUpload(failedFiles);
                }}
              >
                <i className="bi bi-arrow-clockwise me-1"></i> 다시 시도
              </button>
            </div>
          )}
      </div>
    );
  };

  if (compact) {
    return (
      <div className="file-upload-progress compact">
        {renderCompactSummary()}
      </div>
    );
  }

  return (
    <div className="file-upload-progress">
      {renderUploadStatus()}
      {renderUploadErrors()}
      {renderFileList()}
    </div>
  );
};

export default FileUploadProgress;

FileUploadProgress.propTypes = {
  files: PropTypes.arrayOf(PropTypes.object),
  validationResults: PropTypes.arrayOf(PropTypes.object),
  uploadProgress: PropTypes.object,
  uploadStatus: PropTypes.oneOf([
    'idle',
    'validating',
    'uploading',
    'success',
    'error',
    'partial_success',
  ]),
  uploadErrors: PropTypes.arrayOf(PropTypes.object),
  uploadedFiles: PropTypes.arrayOf(PropTypes.object),
  onRemoveFile: PropTypes.func,
  onRetryUpload: PropTypes.func,
  showValidation: PropTypes.bool,
  showProgress: PropTypes.bool,
  showDetailedStatus: PropTypes.bool,
  compact: PropTypes.bool,
};
