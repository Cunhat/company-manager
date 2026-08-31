import { FieldSeparator } from "@/components/ui/field";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { GoogleButton } from "./google-button";

export function AuthFormShell({
  title,
  description,
  callbackURL,
  errorCallbackURL,
  footer,
  children,
}: {
  title: string;
  description: string;
  callbackURL: string;
  errorCallbackURL: string;
  footer: { prompt: string; to: "/login" | "/signup"; label: string };
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>

      <GoogleButton callbackURL={callbackURL} errorCallbackURL={errorCallbackURL} />

      <FieldSeparator>or</FieldSeparator>

      {children}

      <p className="text-center text-sm text-muted-foreground">
        {footer.prompt}{" "}
        <Link
          to={footer.to}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {footer.label}
        </Link>
      </p>
    </div>
  );
}
