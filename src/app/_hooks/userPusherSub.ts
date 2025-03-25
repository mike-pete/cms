import { useSession } from "next-auth/react";
import type { Channel } from "pusher-js";
import { useCallback, useEffect, useState } from "react";
import invariant from "tiny-invariant";
import pusherClient from "~/lib/pusher";

const usePusherSub = () => {
  const { data: session } = useSession();
  invariant(session?.user, "must be authenticated to subscribe");
  const [channel] = useState<Channel>(pusherClient.subscribe(session.user.id));

  useEffect(() => {
    console.log("Subscribing to Pusher channel:", session.user.id);

    return () => {
      console.log("Cleaning up Pusher subscription");
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [channel, session.user, session.user.id]);

  const subscribe = useCallback(
    <T>(event: string, callback: (data: T) => void) => {
      invariant(channel, "channel must be initialized");
      console.log("Binding to event:", event);
      return channel.bind(event, callback);
    },
    [channel],
  );

  return { subscribe };
};

export default usePusherSub;
