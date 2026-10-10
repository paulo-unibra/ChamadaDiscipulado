import { useEffect } from 'react';

const focusableSelector = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]';

export function DialogAccessibility({ children }) {
  useEffect(() => {
    let currentDialog = null;
    let returnFocus = null;
    const synchronize = () => {
      const dialogs = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')];
      const next = dialogs.at(-1) || null;
      if (next === currentDialog) return;
      if (!next && returnFocus?.isConnected) returnFocus.focus();
      if (next && !currentDialog) returnFocus = document.activeElement;
      currentDialog = next;
      if (next) {
        next.setAttribute('tabindex', '-1');
        const initial = next.querySelector('input:not(:disabled), textarea:not(:disabled), select:not(:disabled)') || next.querySelector(focusableSelector) || next;
        initial.focus();
      }
    };
    const handleKey = (event) => {
      if (!currentDialog) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        currentDialog.closest('.modal-overlay')?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      }
      if (event.key === 'Tab') {
        const controls = [...currentDialog.querySelectorAll(focusableSelector)].filter((element) => !element.hidden && element.getClientRects().length > 0);
        const first = controls[0], last = controls.at(-1);
        if (!first) { event.preventDefault(); currentDialog.focus(); return; }
        if (event.shiftKey && (document.activeElement === first || !currentDialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && (document.activeElement === last || !currentDialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }
    };
    const observer = new MutationObserver(synchronize);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('keydown', handleKey, true);
    synchronize();
    return () => { observer.disconnect(); document.removeEventListener('keydown', handleKey, true); };
  }, []);
  return children;
}
