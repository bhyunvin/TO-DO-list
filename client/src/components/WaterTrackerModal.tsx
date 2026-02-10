import { useState } from 'react';
import { Modal } from 'react-bootstrap';
import './WaterTrackerModal.css';
import {
  loadWaterTrackerData,
  saveWaterTrackerData,
  getTodayString,
  type WaterTrackerData,
} from '../utils/waterTrackerUtils';

interface WaterTrackerModalProps {
  show: boolean;
  onHide: () => void;
}

const WaterTrackerModal = ({ show, onHide }: WaterTrackerModalProps) => {
  // lazy initialization을 사용하여 초기 상태 설정
  // 컴포넌트가 리마운트될 때마다 최신 데이터가 로드됨 (key prop 변경으로 인해)
  const [data, setData] = useState<WaterTrackerData>(() => {
    return loadWaterTrackerData();
  });
  const [isEditingCupSize, setIsEditingCupSize] = useState(false);
  const [tempCupSize, setTempCupSize] = useState(data.cupSize);
  const [isAnimating, setIsAnimating] = useState(false);

  // 횟수 증가
  const handleIncrement = () => {
    const newData = {
      ...data,
      count: data.count + 1,
      lastUpdatedDate: getTodayString(),
    };
    setData(newData);
    saveWaterTrackerData(newData);

    // 물 차오르는 애니메이션 효과
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 400);
  };

  // 횟수 감소
  const handleDecrement = () => {
    if (data.count > 0) {
      const newData = {
        ...data,
        count: data.count - 1,
        lastUpdatedDate: getTodayString(),
      };
      setData(newData);
      saveWaterTrackerData(newData);
    }
  };

  // 용량 설정 저장
  const handleSaveCupSize = () => {
    const newCupSize = Math.max(100, Math.min(2000, tempCupSize)); // 100ml ~ 2000ml 제한
    const newData = {
      ...data,
      cupSize: newCupSize,
    };
    setData(newData);
    saveWaterTrackerData(newData);
    setIsEditingCupSize(false);
  };

  // 총 섭취량 계산 (L 단위)
  const totalIntake = (data.count * data.cupSize) / 1000;

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
