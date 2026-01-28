import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import 'sweetalert2/dist/sweetalert2.min.css';
import { BsPaperclip } from '@react-icons/all-files/bs/BsPaperclip';
import { BsX } from '@react-icons/all-files/bs/BsX';
import todoService from '../api/todoService';
import { API_URL } from '../api/client';
import { useFileUploadValidator } from '../hooks/useFileUploadValidator';
import {
  showConfirmAlert,
  showSuccessAlert,
  showErrorAlert,
} from '../utils/alertUtils';

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
    const result = await showConfirmAlert({
      title: '파일 삭제',
      text: '선택한 파일을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.',
      confirmButtonText: '삭제',
      cancelButtonText: '취소',
    });

    if (result.isConfirmed) {
      try {
        await todoService.deleteAttachment(todoSeq, fileNo);
        setAttachments((prev) => prev.filter((file) => file.fileNo !== fileNo));
        showSuccessAlert('삭제 완료', '파일이 삭제되었습니다.');
      } catch (error) {
        console.error('Delete attachment error:', error);
        showErrorAlert('오류 발생', '파일 삭제 중 문제가 발생했습니다.');
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
              <BsPaperclip className="me-2 text-secondary" />
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
              <BsX />
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
