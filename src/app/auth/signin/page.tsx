"use client";
import { signIn, useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect } from "react";

const SignIn: React.FC = () => {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      void signIn("google", { callbackUrl: "/auth/signin/" });
    }
  }, [status]);

  if (session?.user.email) {
    return redirect("/dashboard");
  }

  return (null);
};

export default SignIn;
