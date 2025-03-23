"use client";
import Image from "next/image";
import Link from "next/link";

const GoogleAuthButton: React.FC = () => {
  return (
    <Link href="/auth/signin/">
      <Image
        src="/siginWithGoogle.svg"
        alt="sign in with Google"
        width="175"
        height="40"
      />
    </Link>
  );
};

export default GoogleAuthButton;
