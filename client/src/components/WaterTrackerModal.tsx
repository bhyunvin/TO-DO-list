import { Modal } from 'react-bootstrap';
import './WaterTrackerModal.css';
import useWaterTracker from '../hooks/useWaterTracker';

interface WaterTrackerModalProps {
  show: boolean;
  onHide: () => void;
}

const WaterTrackerModal = ({ show, onHide }: WaterTrackerModalProps) => {
  // 커스텀 훅으로 모든 비즈니스 로직 위임
  const {
    data,
    isEditingCupSize,
    tempCupSize,
    isAnimating,
    totalIntake,
    setIsEditingCupSize,
    setTempCupSize,
    handleIncrement,
    handleDecrement,
    handleSaveCupSize,
  } = useWaterTracker();

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title id="water-tracker-title" className="w-100 text-center">
          오늘의 수분 섭취
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="water-tracker-modal-content">
        {/* 메인 컨트롤 */}
        <div className="water-tracker-controls">
          <button
            className="water-tracker-btn"
            onClick={handleDecrement}
            disabled={data.count === 0}
            aria-label="감소"
          >
            −
          </button>

          <div className="water-tracker-display">
            <div
              className={`water-tracker-icon ${isAnimating ? 'filling' : ''}`}
            >
              💧
            </div>
            <div className="water-tracker-count">{data.count}잔</div>
          </div>

          <button
            className="water-tracker-btn"
            onClick={handleIncrement}
            aria-label="증가"
          >
            +
          </button>
        </div>

        {/* 정보 표시 */}
        <div className="water-tracker-info">
          <div className="water-tracker-total">
            총{' '}
            <span className="water-tracker-total-value">
              {totalIntake.toFixed(2)}L
            </span>{' '}
            섭취
          </div>

          {/* 용량 설정 */}
          <div className="water-tracker-settings">
            <span className="water-tracker-settings-label">1회 용량:</span>
            <button
              className="water-tracker-cup-size-btn"
              onClick={() => setIsEditingCupSize(!isEditingCupSize)}
            >
              ⚙️ {data.cupSize}ml
            </button>
          </div>

          {/* 용량 수정 UI */}
          {isEditingCupSize && (
            <div className="water-tracker-cup-size-modal">
              <div className="water-tracker-cup-size-input-group">
                <input
                  type="number"
                  className="water-tracker-cup-size-input"
                  value={tempCupSize}
                  onChange={(e) => setTempCupSize(Number(e.target.value))}
                  min={100}
                  max={2000}
                  step={50}
                />
                <button
                  className="water-tracker-cup-size-save-btn"
                  onClick={handleSaveCupSize}
                >
                  저장
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default WaterTrackerModal;
