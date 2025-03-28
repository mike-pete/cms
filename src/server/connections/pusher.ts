import PusherServer from "pusher";
import { type z } from "zod";
import { env } from "~/env";
import { pusherEvents } from "~/lib/pusher";

const pusher = new PusherServer({
  appId: env.PUSHER_APP_ID,
  key: env.NEXT_PUBLIC_PUSHER_KEY,
  secret: env.PUSHER_SECRET,
  cluster: env.NEXT_PUBLIC_PUSHER_CLUSTER,
  useTLS: true,
});

type EventKey = keyof typeof pusherEvents;

type TypedPusher = {
  [K in EventKey]: (
    userId: string,
    message: z.infer<(typeof pusherEvents)[K]>,
  ) => Promise<void>;
};

const handler: ProxyHandler<TypedPusher> = {
  get: function (_, prop: string) {
    return async function (userId: string, message: unknown) {
      const messageType = prop as EventKey;
      const schema = pusherEvents[messageType];

      if (!schema) {
        throw new Error(`Unknown message type: ${messageType}`);
      }

      const validatedMessage = schema.parse(message);

      return await pusher.trigger(userId, messageType, validatedMessage);
    };
  },
};

const pub = new Proxy({} as TypedPusher, handler);

export default pub;
