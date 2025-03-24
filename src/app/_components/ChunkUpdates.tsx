"use client";
import { useEffect } from "react";
import usePusherSub from "../_hooks/userPusherSub";
import { useSession } from "next-auth/react";

export default function ChunkUpdates() {
  const { subscribe } = usePusherSub();

  const { data: session } = useSession();

  console.log('session', session)

  useEffect(() => {
    const sub = subscribe<string>("x", (data) => {
      console.log("x", data);
    });

    return () => {
      sub?.unbind();
    };
  }, [subscribe]);
  return <div>ChunkUpdates</div>;
}
