"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the dashboard by default.
    // If the user is unauthenticated, the middleware will intercept and redirect to /login.
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5b7060]"></div>
    </div>
  );
}
