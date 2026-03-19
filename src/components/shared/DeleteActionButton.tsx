"use client";

import { ActionIconButton } from "./ActionIconButton";

type DeleteActionButtonProps = {
  label?: string;
  onClick: () => void;
  disabled?: boolean;
};

export function DeleteActionButton({ label = "Xóa", onClick, disabled }: DeleteActionButtonProps) {
  return (
    <ActionIconButton
      label={label}
      onClick={onClick}
      disabled={disabled}
      variant="delete"
      icon={
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M7.5 3.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v.75h3.75a.75.75 0 0 1 0 1.5h-.57l-.7 9.06A2.25 2.25 0 0 1 12.74 17H7.26a2.25 2.25 0 0 1-2.24-2.19l-.7-9.06h-.57a.75.75 0 0 1 0-1.5H7.5V3.5Zm1.5.75h2V3.5h-2v.75Zm-3 1.5.68 8.83a.75.75 0 0 0 .75.67h5.14a.75.75 0 0 0 .75-.67l.68-8.83H6Z" />
        </svg>
      }
    />
  );
}
