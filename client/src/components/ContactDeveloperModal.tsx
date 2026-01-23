import { useState, useRef } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import PropTypes from 'prop-types';
import contactService from '../api/mailService';
import {
  showSuccessAlert,
  showErrorAlert,
  showWarningAlert,
} from '../utils/alertUtils';

const ContactDeveloperModal = ({ show, onHide }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [isSending, setIsSending] = useState(false);

  // 파일 입력 초기화를 위한 Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // 이미지 파일만 허용 (간단한 체크)
      if (!selectedFile.type.startsWith('image/')) {
        showWarningAlert('이미지 파일만 첨부할 수 있습니다.');
        e.target.value = ''; // 초기화
        setFile(null);
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      showWarningAlert('제목을 입력해주세요.');
      return;
    }

    if (!content.trim() || content.trim().length < 10) {
      showWarningAlert('내용은 최소 10자 이상 입력해주세요.');
      return;
    }

    setIsSending(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      if (file) {
        formData.append('file', file);
      }

      await contactService.sendContactEmail(formData);

      showSuccessAlert('성공', '소중한 의견이 개발자에게 전달되었습니다.');
      handleClose();
    } catch (error) {
      showErrorAlert(
        '전송 실패',
        '메일 발송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      );
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onHide();
  };

  return (
    <Modal
      show={show}
      onHide={isSending ? null : handleClose}
      backdrop="static"
      keyboard={!isSending}
    >
      <Modal.Header closeButton={!isSending}>
        <Modal.Title>개발자에게 문의하기</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3" controlId="contactTitle">
            <Form.Label>제목</Form.Label>
            <Form.Control
              type="text"
              placeholder="문의 제목을 입력하세요 (예: 파일 업로드가 안돼요)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              disabled={isSending}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="contactContent">
            <Form.Label>내용 (버그 제보 / 건의 사항)</Form.Label>
            <Form.Control
              as="textarea"
              rows={7}
              placeholder="문의하실 내용을 최소 10자 이상 입력해주세요. (예: 사파리 브라우저에서 첨부파일을 올릴 때 계속 에러가 발생합니다.)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSending}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="contactFile">
            <Form.Label>스크린샷 첨부 (선택, 이미지)</Form.Label>
            <Form.Control
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isSending}
              ref={fileInputRef}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-end gap-2">
          <Button
            variant="outline-secondary"
            onClick={handleClose}
            disabled={isSending}
          >
            취소
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={isSending}
            className="btn-outline-adaptive"
          >
            {isSending ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                />{' '}
                전송 중...
              </>
            ) : (
              '보내기'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

ContactDeveloperModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
};

export default ContactDeveloperModal;
