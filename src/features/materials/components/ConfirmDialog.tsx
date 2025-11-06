import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function ConfirmDialog({
  open,
  title = '¿Estás seguro?',
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [pending, setPending] = useState(false);
  if (!open) return null;

  async function handleConfirm() {
    try {
      setPending(true);
      await onConfirm();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="mt-2 text-sm text-gray-600">{description}</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="min-w-24"
            onClick={onCancel}
            disabled={pending}
          >
            {cancelText}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`min-w-24 ${danger ? 'border-red-300 text-red-600 hover:bg-red-50' : ''}`}
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending ? 'Procesando…' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
