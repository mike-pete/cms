"use client";
import { signIn } from "next-auth/react";
import Image from "next/image";

const GoogleAuthButton: React.FC = () => {
  return (
    <button onClick={() => void signIn("google")} className="inline-block">
      <Image
        src="/siginWithGoogle.svg"
        alt="sign in with Google"
        width="175"
        height="40"
      />
    </button>
  );
};

export default GoogleAuthButton;
