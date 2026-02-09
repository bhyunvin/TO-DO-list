import { render, within } from '@testing-library/react';
import App from './App';

// Local screen proxy to fix "global document" error in HappyDOM
const screen = new Proxy({} as typeof import('@testing-library/react').screen, {
  get: (_, prop) => {
    if (typeof document !== 'undefined' && document.body) {
      return within(document.body)[prop as keyof ReturnType<typeof within>];
    }
    return undefined;
  },
});

test('renders TO-DO application', async () => {
  render(<App />);
  const titleElement = await screen.findByText(/TO-DO/i);
  expect(titleElement).toBeInTheDocument();
});
