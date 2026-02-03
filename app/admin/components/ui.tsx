'use client';

import Link from 'next/link';
import { memo, ReactNode } from 'react';

/* ===== STAT CARD ===== */
interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: string;
  color?: 'green' | 'red' | 'yellow' | 'cyan';
  isLoading?: boolean;
}

export const StatCard = memo(function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = 'green',
  isLoading = false,
}: StatCardProps) {
  const borderColors = {
    green: 'border-[#00ff00]',
    red: 'border-[#ff0000]',
    yellow: 'border-[#ffff00]',
    cyan: 'border-[#00ffff]',
  };

  return (
    <div className={`admin-stat ${borderColors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="admin-stat-label">{title}</p>
          <p className="admin-stat-value">
            {isLoading ? '---' : value}
          </p>
          {subtitle && (
            <p className="admin-stat-subtitle">{subtitle}</p>
          )}
        </div>
        <span className="text-2xl opacity-50">{icon}</span>
      </div>
    </div>
  );
});

/* ===== QUICK ACTION ===== */
interface QuickActionProps {
  href: string;
  title: string;
  description: string;
  icon: string;
}

export const QuickAction = memo(function QuickAction({
  href,
  title,
  description,
  icon,
}: QuickActionProps) {
  return (
    <Link
      href={href}
      className="admin-card block transition-colors hover:bg-[#1a1a1a]"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl opacity-70">{icon}</span>
        <div>
          <h3 className="text-white font-mono font-semibold text-sm uppercase tracking-wider">{title}</h3>
          <p className="text-[#888] text-xs font-mono mt-1">{description}</p>
        </div>
      </div>
    </Link>
  );
});

/* ===== PAGE HEADER ===== */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export const PageHeader = memo(function PageHeader({
  title,
  subtitle,
  action,
}: PageHeaderProps) {
  return (
    <div className="admin-header flex items-center justify-between">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
});

/* ===== NOTIFICATION ===== */
interface NotificationProps {
  type: 'success' | 'error';
  message: string;
}

export const Notification = memo(function Notification({
  type,
  message,
}: NotificationProps) {
  return (
    <div className={`admin-notification ${type === 'error' ? 'error' : ''}`}>
      {message.toUpperCase()}
    </div>
  );
});

/* ===== ACTION BUTTON ===== */
interface ActionButtonProps {
  onClick: () => void;
  icon: string;
  title: string;
  variant?: 'default' | 'active' | 'danger' | 'warning' | 'info';
  isActive?: boolean;
}

export const ActionButton = memo(function ActionButton({
  onClick,
  icon,
  title,
  variant = 'default',
  isActive,
}: ActionButtonProps) {
  const variants = {
    default: 'bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white border-[#333]',
    active: isActive
      ? 'bg-[#00ff00] text-black border-[#00ff00] hover:bg-[#00cc00]'
      : 'bg-[#1a1a1a] text-[#888] border-[#333] hover:bg-[#2a2a2a]',
    danger: 'bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#ff0000] border-[#ff0000]',
    warning: 'bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#ffff00] border-[#ffff00]',
    info: 'bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#00ffff] border-[#00ffff]',
  };

  return (
    <button
      onClick={onClick}
      className={`p-2 border-2 transition-colors font-mono text-xs ${variants[variant]}`}
      title={title}
    >
      {icon}
    </button>
  );
});

/* ===== FILTER TABS ===== */
interface FilterTabsProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}

export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
}: FilterTabsProps<T>) {
  return (
    <div className="admin-filter">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`admin-filter-btn ${value === option ? 'active' : ''}`}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

/* ===== MODAL ===== */
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal = memo(function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'lg',
}: ModalProps) {
  if (!isOpen) return null;

  const widths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  return (
    <div className="admin-modal-overlay">
      <div className={`admin-modal ${widths[maxWidth]}`}>
        <div className="admin-modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} className="admin-modal-close">
            &times;
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
});

/* ===== INFO BOX ===== */
interface InfoBoxProps {
  title?: string;
  children: ReactNode;
  icon?: string;
}

export const InfoBox = memo(function InfoBox({
  title,
  children,
  icon = 'i',
}: InfoBoxProps) {
  return (
    <div className="admin-info">
      {title && (
        <h3 className="admin-info-title flex items-center gap-2">
          <span className="opacity-70">{icon}</span>
          {title}
        </h3>
      )}
      <div className="admin-info-text">{children}</div>
    </div>
  );
});

/* ===== EMPTY STATE ===== */
interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState = memo(function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 admin-card">
      <div className="text-4xl mb-4 opacity-50">{icon}</div>
      <h3 className="text-lg font-mono font-medium text-white mb-2 uppercase tracking-wider">
        {title}
      </h3>
      <p className="text-[#888] mb-4 text-xs font-mono uppercase tracking-wider">
        {description}
      </p>
      {action && (
        <button onClick={action.onClick} className="admin-btn-primary">
          {action.label}
        </button>
      )}
    </div>
  );
});

/* ===== LOADING STATE ===== */
export const LoadingState = memo(function LoadingState() {
  return (
    <div className="text-center py-12">
      <div className="text-gray-400 animate-pulse font-mono text-sm uppercase tracking-wider">
        Loading...
      </div>
    </div>
  );
});

/* ===== TOGGLE SWITCH ===== */
interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  color?: 'green' | 'yellow' | 'red';
}

export const ToggleSwitch = memo(function ToggleSwitch({
  checked,
  onChange,
  color = 'green',
}: ToggleSwitchProps) {
  const colors = {
    green: 'bg-[#00ff00] border-[#00ff00]',
    yellow: 'bg-[#ffff00] border-[#ffff00]',
    red: 'bg-[#ff0000] border-[#ff0000]',
  };

  return (
    <button
      onClick={onChange}
      className={`admin-toggle ${checked ? colors[color] : ''}`}
    >
      <div
        className={`admin-toggle-knob ${checked ? 'translate-x-7' : 'translate-x-0'}`}
      />
    </button>
  );
});
