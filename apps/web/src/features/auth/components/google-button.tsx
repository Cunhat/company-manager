import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { IconBrandGoogle } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

export function GoogleButton({
  callbackURL,
  errorCallbackURL,
}: {
  callbackURL: string;
  errorCallbackURL: string;
}) {
  const [pending, setPending] = useState(false);

  async function handleGoogleSignIn() {
    setPending(true);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL,
        errorCallbackURL,
      });
      if (result.error) {
        toast.error(result.error.message || "Google sign in failed");
      }
    } catch {
      toast.error("Google sign in failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-full"
      disabled={pending}
      onClick={handleGoogleSignIn}
    >
      {pending ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <IconBrandGoogle data-icon="inline-start" />
      )}
      Continue with Google
    </Button>
  );
}
