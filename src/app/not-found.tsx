import Link from "next/link";

function NotFoundPage() {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="flex flex-col items-center gap-6 text-neutral-100">
        <h1 className="text-5xl font-extrabold tracking-tight">404</h1>
        <h2 className="text-3xl font-semibold">Page not found</h2>
        <p className="text-lg text-neutral-400">
          The page you are looking for does not exist.
        </p>
        <Link
          href="/"
          className="rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-100 transition-colors hover:bg-neutral-700 hover:text-white"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
