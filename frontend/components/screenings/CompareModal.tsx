import { Modal } from "../ui/Modal";

export const CompareModal = ({ open, onClose, data }: { open: boolean; onClose: () => void; data: Record<string, unknown> | null }) => (
  <Modal open={open} onClose={onClose}>
    <h3 className="text-lg font-semibold text-slate-900">Candidate Comparison</h3>
    <pre className="mt-3 max-h-64 overflow-auto rounded-xl border border-brand-100 bg-brand-50/50 p-4 text-xs text-slate-700">
      {JSON.stringify(data ?? {}, null, 2)}
    </pre>
  </Modal>
);
