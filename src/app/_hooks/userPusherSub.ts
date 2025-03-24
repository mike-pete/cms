import { useSession } from "next-auth/react";
import type { Channel } from "pusher-js";
import { useCallback, useEffect, useState } from "react";
import pusherClient from "~/lib/pusher";

const usePusherSub = () => {
  const [channel, setChannel] = useState<Channel | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }

    console.log("Subscribing to Pusher channel:", session.user.id);
    const newChannel = pusherClient.subscribe(session.user.id);
    setChannel(newChannel);

    return () => {
      console.log("Cleaning up Pusher subscription");
      if (newChannel) {
        newChannel.unbind_all();
        newChannel.unsubscribe();
      }
      setChannel(null);
    };
  }, [session?.user.id]); // Re-run if user ID changes

  const subscribe = useCallback(
    <T>(event: string, callback: (data: T) => void) => {
      if (!channel) {
        console.warn("Attempted to subscribe before channel was ready");
        return null;
      }
      console.log("Binding to event:", event);
      return channel.bind(event, callback);
    },
    [channel],
  );

  return { subscribe, isConnected: !!channel };
};

export default usePusherSub;
