"use client";
import { signOut } from "next-auth/react";
import { useEffect } from "react";

const SignIn: React.FC = () => {
  useEffect(() => {
    void signOut({ callbackUrl: "/", redirect: true });
  }, []);
  return null;
};

export default SignIn;
