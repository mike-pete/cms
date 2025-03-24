import { useSession } from "next-auth/react";
import type { Channel } from "pusher-js";
import { useEffect, useState } from "react";
import invariant from "tiny-invariant";
import pusherClient from "~/lib/pusher";

const usePusherSub = () => {
  const [channel, setChannel] = useState<Channel | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    invariant(
      session?.user.id,
      "only authenticated users can subscribe to push notifications",
    );

    const newChannel = pusherClient.subscribe(session.user.id);
    setChannel(newChannel);

    return () => {
      if (channel) {
        channel.unbind_all();
        channel.unsubscribe();
      }
    };
  }, []);

  const subscribe = <T>(event: string, callback: (data: T) => void) => {
    return channel?.bind(event, callback);
  };

  return { subscribe };
};

export default usePusherSub;
