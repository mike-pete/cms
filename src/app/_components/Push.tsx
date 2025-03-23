"use client";
import Pusher from "pusher-js/with-encryption";
import { useEffect } from "react";
import { env } from "~/env";
import { api } from "~/trpc/react";

const { NEXT_PUBLIC_PUSHER_KEY, NEXT_PUBLIC_PUSHER_CLUSTER } = env;

const pusher = new Pusher(NEXT_PUBLIC_PUSHER_KEY, {
  cluster: NEXT_PUBLIC_PUSHER_CLUSTER,
});

const channel = pusher.subscribe("channel-id");

export default function Push() {
  const triggerEvent = api.contact.sendNotification.useMutation();
  useEffect(() => {
    channel.bind("my-event", (data: string) => {
      console.log(data);
    });
  }, []);
  return (
    <div>
      Push
      <button
        onClick={() =>
          triggerEvent.mutate({
            channel: "channel-id",
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
