import { ReactNode } from 'react';

interface FloatingIconButtonProps {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export default function FloatingIconButton({ onClick, title, disabled, className = '', children }: FloatingIconButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`bg-white/90 backdrop-blur p-2.5 rounded-full shadow-lg hover:bg-white transition-colors disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}
