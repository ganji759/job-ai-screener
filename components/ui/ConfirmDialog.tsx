import { Button } from "./Button";
import { Modal } from "./Modal";

export const ConfirmDialog = ({ open, title, description, onConfirm, onClose }: { open: boolean; title: string; description: string; onConfirm: () => void; onClose: () => void }) => (
  <Modal open={open} onClose={onClose}>
    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</p>
    <div className="mt-4 flex flex-wrap justify-end gap-2">
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="danger" onClick={onConfirm}>
        Confirm
      </Button>
    </div>
  </Modal>
);
