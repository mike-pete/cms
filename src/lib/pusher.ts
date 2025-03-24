import PusherClient from "pusher-js";
import { env } from "~/env";

const pusherClient = new PusherClient(env.NEXT_PUBLIC_PUSHER_KEY, {
  cluster: env.NEXT_PUBLIC_PUSHER_CLUSTER,
});

export default pusherClient;
