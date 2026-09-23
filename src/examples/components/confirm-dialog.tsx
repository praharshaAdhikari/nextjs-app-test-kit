'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ConfirmDialogProps = {
  /** Label of the button that opens the dialog. */
  triggerLabel: string;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  /** May return a promise; the dialog stays open, with an error, if it rejects. */
  onConfirm: () => void | Promise<void>;
};

/**
 * Asks before doing something destructive. Behaviours worth testing: opening, where focus goes,
 * the three ways to close (Cancel, Escape, confirming), and a failed confirm keeping it open.
 * Rendered into document.body with a portal, like most dialog libraries.
 */
export function ConfirmDialog({
  triggerLabel,
  title,
  children,
  confirmLabel = 'Confirm',
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Focus the safe choice when the dialog opens.
    if (open) cancelRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    setFailed(false);
    triggerRef.current?.focus(); // give focus back to where the user was
  }

  async function confirm() {
    setBusy(true);
    setFailed(false);
    try {
      await onConfirm();
      close();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
        {triggerLabel}
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onKeyDown={(event) => {
              if (event.key === 'Escape') close();
            }}
          >
            <h2 id={titleId}>{title}</h2>
            <div>{children}</div>
            {failed && <p role="alert">That did not work. Please try again.</p>}
            <button ref={cancelRef} type="button" onClick={close}>
              Cancel
            </button>
            <button type="button" onClick={confirm} disabled={busy} aria-busy={busy || undefined}>
              {confirmLabel}
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
