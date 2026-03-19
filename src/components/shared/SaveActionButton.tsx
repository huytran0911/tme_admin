"use client";

import { ActionIconButton } from "./ActionIconButton";

type SaveActionButtonProps = {
  label?: string;
  onClick: () => void;
  disabled?: boolean;
};

export function SaveActionButton({ label = "Lưu", onClick, disabled }: SaveActionButtonProps) {
  return (
    <ActionIconButton
      label={label}
      onClick={onClick}
      disabled={disabled}
      variant="primary"
      icon={
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M16.78 5.72a.75.75 0 0 0-1.06-1.06l-7.25 7.25-3.19-3.2a.75.75 0 1 0-1.06 1.06l3.72 3.72a.75.75 0 0 0 1.06 0l7.78-7.77Z" />
        </svg>
      }
    />
  );
}
