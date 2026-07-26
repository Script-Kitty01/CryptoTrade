import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Converter from "@/components/converter";

describe("Converter", () => {
  const priceList = {
    usd: 50_000,
    eur: 46_000,
    gbp: 39_000,
  };

  it("renders with default values", () => {
    render(
      <Converter symbol="btc" icon="/bitcoin.png" priceList={priceList} />,
    );

    expect(screen.getByText("BTC Converter")).toBeInTheDocument();
    expect(screen.getByDisplayValue("10")).toBeInTheDocument();
    expect(
      screen.getByText(
        (content) => content.replace(/[^0-9]/g, "") === "50000000",
      ),
    ).toBeInTheDocument();
  });

  it("updates converted value when amount changes", async () => {
    const user = userEvent.setup();
    render(
      <Converter symbol="btc" icon="/bitcoin.png" priceList={priceList} />,
    );

    const input = screen.getByPlaceholderText("Amount");
    await user.clear(input);
    await user.type(input, "2");

    expect(
      screen.getByText(
        (content) => content.replace(/[^0-9]/g, "") === "10000000",
      ),
    ).toBeInTheDocument();
  });

  it("updates converted value when currency changes", async () => {
    const user = userEvent.setup();
    render(
      <Converter symbol="btc" icon="/bitcoin.png" priceList={priceList} />,
    );

    const trigger = screen.getByRole("combobox");
    await user.click(trigger);

    // Radix Select renders options in a portal. Wait for the dropdown to
    // open and then query the document body for the option text.
    await waitFor(
      () => expect(trigger).toHaveAttribute("aria-expanded", "true"),
      { timeout: 2000 },
    );
    const eurOption = await screen.findByText((content) =>
      content.toLowerCase().includes("eur"),
    );
    await user.click(eurOption);
    await waitFor(
      () =>
        expect(
          screen.getByText(
            (content) => content.replace(/[^0-9]/g, "") === "46000000",
          ),
        ).toBeInTheDocument(),
      { timeout: 2000 },
    );
    await waitFor(
      () => expect(trigger).toHaveAttribute("aria-expanded", "false"),
      { timeout: 2000 },
    );

    expect(
      screen.getByText(
        (content) => content.replace(/[^0-9]/g, "") === "46000000",
      ),
    ).toBeInTheDocument();
  });
});
