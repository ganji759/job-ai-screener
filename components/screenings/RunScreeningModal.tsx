"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

export const RunScreeningModal = ({ open, onClose, onRun }: { open: boolean; onClose: () => void; onRun: (size: 10 | 20) => Promise<void> }) => {
  const [size, setSize] = useState<10 | 20>(10);
  return (
    <Modal open={open} onClose={onClose}>
      <h3 className="text-lg font-semibold text-slate-900">Start AI Screening</h3>
      <p className="mt-2 text-sm text-slate-600">Screening runs in the background. You can navigate away safely.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" variant={size === 10 ? "primary" : "secondary"} onClick={() => setSize(10)}>
          Top 10
        </Button>
        <Button type="button" variant={size === 20 ? "primary" : "secondary"} onClick={() => setSize(20)}>
          Top 20
        </Button>
      </div>
      <Button className="mt-6 w-full" onClick={() => void onRun(size)}>
        Start Screening
      </Button>
    </Modal>
  );
};
