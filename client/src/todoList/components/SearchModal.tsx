import { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import PropTypes from 'prop-types';
import DatePicker from 'react-datepicker';
import { ko } from 'date-fns/locale';
import {
  subYears,
  subMonths,
  differenceInYears,
  differenceInDays,
  format,
} from 'date-fns';
import todoService from '../../api/todoService';

const SearchModal = ({ show, onHide, onMoveToDate }) => {
  const [keyword, setKeyword] = useState('');
  const [startDate, setStartDate] = useState(subYears(new Date(), 1));
  const [endDate, setEndDate] = useState(new Date());
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isValidRange, setIsValidRange] = useState(true);

  useEffect(() => {
    if (show) {
      setKeyword('');
      setStartDate(subYears(new Date(), 1));
      setEndDate(new Date());
      setIsValidRange(true);
      setSearchResults([]);
      setHasSearched(false);
    }
  }, [show]);

  useEffect(() => {
    if (startDate && endDate) {
      const diffYears = differenceInYears(endDate, startDate);
      if (startDate > endDate) {
        setIsValidRange(false);
      } else if (diffYears >= 5) {
        const diffDays = differenceInDays(endDate, startDate);
        if (diffDays > 365 * 5 + 2) {
          setIsValidRange(false);
        } else {
          setIsValidRange(true);
        }
      } else {
        setIsValidRange(true);
      }
    }
  }, [startDate, endDate]);

  // 검색 수행 (모달 닫지 않음)
  const performSearch = useCallback(async () => {
    if (!isValidRange) return;

    setIsSearching(true);
    try {
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');

      const results = await todoService.searchTodos(
        formattedStartDate,
        formattedEndDate,
        keyword,
      );
      setSearchResults(results);
      setHasSearched(true);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [keyword, startDate, endDate, isValidRange]);

  const handleSearchClick = () => {
    performSearch();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // 폼 제출 방지
      performSearch();
    }
  };

  // 자동 검색 로직
  useEffect(() => {
    if (!show || !isValidRange) return;

    // 검색어가 없으면 자동 검색 하지 않음 (키워드 입력 시에만 동작)
    if (!keyword.trim()) return;

    const diffYears = differenceInYears(endDate, startDate);
    if (diffYears > 5) return; // 5년 초과시에만 자동검색 제한 (유효성 검사가 막아주겠지만 이중 체크)

    const timer = setTimeout(() => {
      performSearch();
    }, 1000);

    return () => clearTimeout(timer);
  }, [keyword, startDate, endDate, performSearch, show, isValidRange]);

  const setPreset = (months) => {
    const end = new Date();
    let start;

    if (months === 60) {
      start = subYears(end, 5);
    } else if (months === 12) {
      start = subYears(end, 1);
    } else {
      start = subMonths(end, months);
    }

    setEndDate(end);
    setStartDate(start);
  };

  const datePresets = [
    { label: '1개월', months: 1 },
    { label: '3개월', months: 3 },
    { label: '6개월', months: 6 },
    { label: '1년', months: 12 },
    { label: '5년', months: 60 },
  ];

  // 텍스트 말줄임 처리 헬퍼 함수
  const truncateText = (text, maxLength = 20) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size="lg"
      className="search-modal"
      // contentClassName 제거 -> CSS에서 제어
    >
      <Modal.Header closeButton className="border-secondary">
        <Modal.Title>상세 검색</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          {/* 날짜 선택 - 상단 배치 */}
          <div className="mb-3">
            <Form.Label>조회 기간</Form.Label>
            {/* 반응형 레이아웃: 모바일(기본)은 세로, sm 이상은 가로(side-by-side) */}
            <div className="d-flex flex-column flex-sm-row mb-2 align-items-center">
              <div className="date-picker-wrapper">
                <DatePicker
                  locale={ko}
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  dateFormat="yyyy-MM-dd"
                  className="form-control date-picker-input"
                  placeholderText="시작일"
                  maxDate={endDate}
                />
              </div>
              {/* 물결 위치 수정: 수직 중앙 정렬을 위해 d-flex 사용 */}
              <div className="d-none d-sm-flex align-items-center justify-content-center text-secondary date-separator">
                ~
              </div>
              <div className="date-picker-wrapper">
                <DatePicker
                  locale={ko}
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  dateFormat="yyyy-MM-dd"
                  className="form-control date-picker-input"
                  placeholderText="종료일"
                  minDate={startDate}
                />
              </div>
            </div>

            {/* 프리셋 버튼 */}
            <div className="d-flex flex-wrap preset-btn-container">
              {datePresets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setPreset(preset.months)}
                  className="preset-btn"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            {!isValidRange && (
              <div className="text-danger mt-1 small">
                조회 기간은 최대 5년까지만 가능합니다.
              </div>
            )}
          </div>

          {/* 검색어 입력 - 하단 배치 */}
          <Form.Group className="mb-3" controlId="searchKeyword">
            <Form.Label>검색어 (내용, 비고)</Form.Label>
            <Form.Control
              type="text"
              placeholder="내용 또는 비고를 입력하세요"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="search-input"
            />
          </Form.Group>

          {/* 결과 목록 */}
          {hasSearched && (
            <div className="mt-4">
              <h6 className="text-muted mb-2">
                검색 결과 ({searchResults.length}건)
              </h6>
              <div className="table-responsive search-result-container">
                <table className="table table-hover table-sm small mb-0 w-100 search-result-table">
                  <thead className="sticky-top">
                    <tr>
                      <th className="col-content">내용</th>
                      <th className="col-date">완료일시</th>
                      <th className="col-note">비고</th>
                      <th className="col-action">이동</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.length > 0 ? (
                      searchResults.map((todo) => (
                        <tr key={todo.todoSeq}>
                          <td title={todo.todoContent}>
                            {truncateText(todo.todoContent, 15)}
                          </td>
                          <td>
                            {todo.completeDtm
                              ? format(new Date(todo.completeDtm), 'yyyy-MM-dd')
                              : '-'}
                          </td>
                          <td title={todo.todoNote}>
                            {truncateText(todo.todoNote, 10)}
                          </td>
                          <td className="text-center">
                            <Button
                              variant="outline-info"
                              size="sm"
                              className="move-btn"
                              onClick={() => {
                                const targetDate = todo.completeDtm
                                  ? format(
                                      new Date(todo.completeDtm),
                                      'yyyy-MM-dd',
                                    )
                                  : todo.todoDate;

                                if (!targetDate) {
                                  console.error(
                                    'Invalid target date for todo:',
                                    todo,
                                  );
                                  return;
                                }
                                onMoveToDate(targetDate);
                                onHide();
                              }}
                            >
                              이동
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center text-secondary py-3"
                        >
                          검색 결과가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer className="border-top-0 d-flex justify-content-end gap-2">
        <Button variant="outline-secondary" onClick={onHide}>
          취소
        </Button>
        <Button
          variant="primary"
          onClick={handleSearchClick}
          disabled={!isValidRange || isSearching}
          className="btn-outline-adaptive"
        >
          {isSearching ? '검색 중...' : '검색'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

SearchModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  onMoveToDate: PropTypes.func.isRequired,
};

export default SearchModal;
