import { Window } from 'happy-dom';
const window = new Window();
globalThis.window = window as any;
globalThis.document = window.document as any;

import { render, screen, cleanup } from '../test-utils';
import { describe, test, expect, afterEach } from 'bun:test';
import WaterTrackerModal from './WaterTrackerModal';

afterEach(() => {
  cleanup();
});

describe('WaterTrackerModal', () => {
  test('물 마시기 모달이 렌더링되어야 함', () => {
    console.log('Diagnostic - document:', !!globalThis.document);
    console.log('Diagnostic - document.body:', !!globalThis.document?.body);
    render(<WaterTrackerModal show={true} onHide={() => {}} />);
    expect(screen.getByText(/오늘의 수분 섭취/i)).toBeDefined();
  });
});
