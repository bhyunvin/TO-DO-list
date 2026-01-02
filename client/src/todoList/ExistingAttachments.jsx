import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';
import todoService from '../api/todoService';
import { API_URL } from '../api/apiClient';
import { useFileUploadValidator } from '../hooks/useFileUploadValidator';

const ExistingAttachments = ({ todoSeq }) => {
  const [attachments, setAttachments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { formatFileSize } = useFileUploadValidator();

  const fetchAttachments = useCallback(async () => {
    try {
      const data = await todoService.getAttachments(todoSeq);
      setAttachments(data);
    } catch (error) {
      console.error('Failed to fetch attachments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [todoSeq]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const handleDelete = async (fileNo) => {
    const result = await Swal.fire({
      title: '파일 삭제',
      text: '선택한 파일을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '삭제',
      cancelButtonText: '취소',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
    });

    if (result.isConfirmed) {
      try {
        await todoService.deleteAttachment(todoSeq, fileNo);
        setAttachments((prev) => prev.filter((file) => file.fileNo !== fileNo));
        Swal.fire('삭제 완료', '파일이 삭제되었습니다.', 'success');
      } catch (error) {
        console.error('Delete attachment error:', error);
        Swal.fire('오류', '파일 삭제에 실패했습니다.', 'error');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="text-center my-2">
        <small>파일 목록 불러오는 중...</small>
      </div>
    );
  }

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="mb-3">
      <div className="mb-2 fw-bold">기존 첨부파일</div>
      <div className="list-group">
        {attachments.map((file) => (
          <div
            key={file.fileNo}
            className="list-group-item d-flex justify-content-between align-items-center p-2"
          >
            <div className="d-flex align-items-center overflow-hidden">
              <i className="bi bi-paperclip me-2 text-secondary"></i>
              <a
                href={`${API_URL}/file/${file.fileNo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-decoration-none text-truncate d-block"
                style={{ maxWidth: '200px' }}
                title={file.originalFileName}
              >
                {file.originalFileName}{' '}
                <small className="text-muted">
                  ({formatFileSize(file.fileSize)})
                </small>
              </a>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger ms-2"
              onClick={() => handleDelete(file.fileNo)}
              title="삭제"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

ExistingAttachments.propTypes = {
  todoSeq: PropTypes.number.isRequired,
};

export default ExistingAttachments;
