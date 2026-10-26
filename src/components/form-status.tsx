"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

type SubmitButtonProps = Omit<ButtonProps, "children" | "type"> & {
  children: string;
  pendingText?: string;
};

export function SubmitButton({
  children,
  pendingText = "Working…",
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      {...props}
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending || undefined}
    >
      {pending ? pendingText : children}
    </Button>
  );
}
