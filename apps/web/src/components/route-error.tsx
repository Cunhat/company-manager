import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "./ui/button";

export default function RouteError() {
  const router = useRouter();
  const { reset } = useQueryErrorResetBoundary();
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    reset();
  }, [reset]);

  async function retry() {
    setIsRetrying(true);
    reset();
    try {
      await router.invalidate();
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <div role="alert" className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <p className="text-sm">Could not load this page. Please try again.</p>
      <Button variant="outline" disabled={isRetrying} onClick={() => void retry()}>
        {isRetrying ? "Retrying..." : "Try again"}
      </Button>
    </div>
  );
}
