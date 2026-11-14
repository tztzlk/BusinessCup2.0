"use client";

import { useRef, useState, type ReactNode } from "react";
import { UploadCloud } from "lucide-react";
import { Button } from "./Button";
import { cn } from "./cn";

/**
 * Drag & drop zone plus a "choose files" button (the keyboard path). Files are handed to
 * `onFiles` as they are; the caller checks type and size.
 */
export function FileUploader({
  accept,
  multiple = false,
  disabled = false,
  onFiles,
  title,
  hint,
  buttonLabel = "Choose files",
  footer,
}: {
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  title: ReactNode;
  hint?: ReactNode;
  buttonLabel?: string;
  footer?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const take = (list: FileList | null | undefined) => {
    if (!list || list.length === 0 || disabled) return;
    const files = Array.from(list);
    onFiles(multiple ? files : files.slice(0, 1));
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        take(e.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col items-center justify-center rounded-card border-2 border-dashed px-4 py-10 text-center transition-colors sm:py-12",
        dragging ? "border-primary bg-primary-50" : "border-brand-200 bg-surface",
        disabled && "opacity-60",
      )}
    >
      <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary">
        <UploadCloud className="h-7 w-7" />
      </span>
      <p className="mt-4 text-lg font-semibold text-fg-primary sm:text-xl">{title}</p>
      {hint && <div className="mt-1 text-sm text-fg-secondary">{hint}</div>}
      <Button className="mt-5" onClick={() => inputRef.current?.click()} disabled={disabled}>
        {buttonLabel}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
      {footer && <div className="mt-4 text-[13px] text-fg-muted">{footer}</div>}
    </div>
  );
}
