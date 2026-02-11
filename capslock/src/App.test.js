import { render, screen } from "@testing-library/react";
import App from "./App";

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve([]),
    })
  );
});

test("renders title", async () => {
  render(<App />);
  const titleElement = await screen.findByText(/capslock/i);
  expect(titleElement).toBeInTheDocument();
});
