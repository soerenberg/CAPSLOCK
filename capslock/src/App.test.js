import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve([])
    })
  );
});

afterEach(() => {
  jest.resetAllMocks();
});

test('renders app title', async () => {
  render(<App />);
  await waitFor(() => {
    expect(screen.getByText('CAPSLOCK')).toBeInTheDocument();
  });
});
