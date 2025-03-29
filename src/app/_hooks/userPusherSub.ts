"use client";

import { useSession } from "next-auth/react";
import type { Channel } from "pusher-js";
import { useCallback, useEffect, useState } from "react";
import invariant from "tiny-invariant";
import { type z } from "zod";
import { pusherClient, pusherEvents } from "~/lib/pusher";

const usePusherSub = () => {
  const { data: session } = useSession();
  invariant(session?.user, "must be authenticated to subscribe");
  const [channel] = useState<Channel>(pusherClient.subscribe(session.user.id));

  useEffect(() => {
    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [channel, session.user, session.user.id]);

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

  return { subscribe };
};

export default usePusherSub;
