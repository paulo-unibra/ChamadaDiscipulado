export function Modal({ children, onClose, className = '' }) {
  return <div className={`modal-overlay ${className}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>{children}</div>;
}
