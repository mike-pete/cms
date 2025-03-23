"use client";
import { useSession } from "next-auth/react";
import Link from "next/link";

const GoogleAuthButton: React.FC = () => {
  const { data: session, status } = useSession();

  if (session?.user.email) {
    return <Link href="/auth/signout/">Sign Out</Link>;
  }

  return <Link href="/auth/signin/">Sign In</Link>;
};

export default GoogleAuthButton;
