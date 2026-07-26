import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CoinsPagination from "@/components/CoinsPagination";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("CoinsPagination", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders page numbers", () => {
    render(
      <CoinsPagination currentPage={5} totalPages={20} hasMorePages={true} />,
    );

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("navigates to previous page", async () => {
    const user = userEvent.setup();
    render(
      <CoinsPagination currentPage={3} totalPages={20} hasMorePages={true} />,
    );

    const prevButton = screen.getByLabelText("Go to previous page");
    await user.click(prevButton);

    expect(mockPush).toHaveBeenCalledWith("/coins?page=2");
  });

  it("disables previous button on first page", () => {
    render(
      <CoinsPagination currentPage={1} totalPages={20} hasMorePages={true} />,
    );

    const prevButton = screen.getByLabelText("Go to previous page");
    expect(prevButton).toHaveClass("control-disabled");
  });

  it("disables next button on last page", () => {
    render(
      <CoinsPagination currentPage={20} totalPages={20} hasMorePages={true} />,
    );

    const nextButton = screen.getByLabelText("Go to next page");
    expect(nextButton).toHaveClass("control-disabled");
  });
});
