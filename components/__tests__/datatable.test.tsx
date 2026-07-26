import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import DataTable from "@/components/datatable";

interface TestRow {
  id: string;
  name: string;
  value: number;
}

describe("DataTable", () => {
  const data: TestRow[] = [
    { id: "1", name: "Bitcoin", value: 50_000 },
    { id: "2", name: "Ethereum", value: 3_000 },
  ];

  const columns: DataTableColumn<TestRow>[] = [
    { header: "Name", cell: (row) => row.name },
    { header: "Value", cell: (row) => `$${row.value.toLocaleString()}` },
  ];

  it("renders headers", () => {
    render(
      <DataTable data={data} columns={columns} rowKey={(row) => row.id} />,
    );

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Value")).toBeInTheDocument();
  });

  it("renders rows", () => {
    render(
      <DataTable data={data} columns={columns} rowKey={(row) => row.id} />,
    );

    expect(screen.getByText("Bitcoin")).toBeInTheDocument();
    expect(screen.getByText("Ethereum")).toBeInTheDocument();
    expect(screen.getByText("$50,000")).toBeInTheDocument();
  });

  it("renders empty table when data is empty", () => {
    render(
      <DataTable data={[]} columns={columns} rowKey={(_, index) => index} />,
    );

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.queryByText("Bitcoin")).not.toBeInTheDocument();
  });
});
