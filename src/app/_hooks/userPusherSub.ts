"use client";

import { useSession } from "next-auth/react";
import type { Channel } from "pusher-js";
import { useCallback, useEffect, useState } from "react";
import invariant from "tiny-invariant";
import { type z } from "zod";
import { pusherClient, pusherEvents } from "~/lib/pusher";

const usePusherSub = () => {
  const { data: session, status } = useSession();
  const [channel, setChannel] = useState<Channel | null>(null);

  useEffect(() => {
    // Only set up subscription when session is loaded and user exists
    if (status === "authenticated" && session?.user?.id) {
      const newChannel = pusherClient.subscribe(session.user.id);
      setChannel(newChannel);

      return () => {
        newChannel.unbind_all();
        newChannel.unsubscribe();
      };
    }

    // Cleanup if session is lost
    return () => {
      if (channel) {
        channel.unbind_all();
        channel.unsubscribe();
        setChannel(null);
      }
    };
  }, [status, session?.user?.id, channel]);

  const subscribe = useCallback(
    <EventKey extends keyof typeof pusherEvents>(
      event: EventKey,
      callback: (data: z.infer<(typeof pusherEvents)[EventKey]>) => void,
    ) => {
      invariant(channel, "channel must be initialized");

      const eventHandler = (data: z.infer<(typeof pusherEvents)[EventKey]>) => {
        const validatedData = pusherEvents[event].parse(data);
        callback(validatedData);
      };

      return channel.bind(event, eventHandler);
    },
    [channel],
  );

  return { subscribe, isReady: !!channel };
};

export default usePusherSub;
