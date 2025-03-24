"use client";
import { useEffect } from "react";
import { api } from "~/trpc/react";
import usePusherSub from "../_hooks/userPusherSub";

export default function Push() {
  const triggerEvent = api.contact.sendNotification.useMutation();
  const { subscribe } = usePusherSub();

  useEffect(() => {
    const sub = subscribe<string>("my-event", (data) => {
      console.log("aah", data);
    });

    return () => {
      sub?.unbind();
    };
  }, [subscribe]);

  return (
    <div>
      Push
      <button
        onClick={() =>
          triggerEvent.mutate({
            event: "my-event",
            data: "hello",
          })
        }
      >
        trigger
      </button>
    </div>
  );
}
