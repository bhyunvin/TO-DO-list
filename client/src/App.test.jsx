import { render, screen } from '@testing-library/react';
import App from './App';

test('renders TO-DO application', () => {
  render(<App />);
  const titleElement = screen.getByText(/TO-DO/i);
  expect(titleElement).toBeInTheDocument();
});
