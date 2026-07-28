"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import HoldingsTable from "@/components/portfolio/HoldingsTable";
import AddHoldingDialog from "@/components/portfolio/AddHoldingDialog";

export default function PortfolioPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAdded = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <main className="main-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Portfolio
          </h1>
          <p className="text-sm text-purple-100/60 mt-1">
            Track your holdings and P&L
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4 mr-2" />
          Add Holding
        </Button>
      </div>

      <div className="bg-dark-500 rounded-xl border border-purple-600/20 p-5">
        <HoldingsTable key={refreshKey} />
      </div>

      <AddHoldingDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdded={handleAdded}
      />
    </main>
  );
}
