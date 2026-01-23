import { render, screen } from '@testing-library/react';
import App from './App';

test('renders TO-DO application', async () => {
  render(<App />);
  const titleElement = await screen.findByText(/TO-DO/i);
  expect(titleElement).toBeInTheDocument();
});
