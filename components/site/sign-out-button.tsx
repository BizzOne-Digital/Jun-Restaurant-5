"use client";

import { signOut } from "next-auth/react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Props = Omit<ButtonProps, "onClick"> & {
  callbackUrl?: string;
};

export function SignOutButton({ callbackUrl = "/", className, variant = "outline", ...props }: Props) {
  return (
    <Button
      type="button"
      variant={variant}
      className={cn(className)}
      onClick={() => signOut({ callbackUrl })}
      {...props}
    >
      Sign out
    </Button>
  );
}
