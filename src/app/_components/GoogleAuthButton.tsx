"use client";
import { useSession } from "next-auth/react";
import Link from "next/link";

const GoogleAuthButton: React.FC = () => {
  const { data: session, status } = useSession();

  if (session?.user.email) {
    return <Link href="/auth/signout/" className="font-semibold text-sm">sign out</Link>;
  }

  return <Link href="/auth/signin/" className="font-semibold text-sm">sign in</Link>;
};

export default GoogleAuthButton;
