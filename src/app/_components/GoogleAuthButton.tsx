import Link from "next/link";
import { auth } from "~/server/auth";

const GoogleAuthButton: React.FC = async () => {
  const session = await auth();

  if (session?.user.email) {
    return (
      <Link href="/auth/signout/" className="text-sm font-semibold">
        sign out
      </Link>
    );
  }

  return (
    <Link href="/auth/signin/" className="text-sm font-semibold">
      sign in
    </Link>
  );
};

export default GoogleAuthButton;
