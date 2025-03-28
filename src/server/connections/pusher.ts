import PusherServer from "pusher";
import { env } from "~/env";

const pusher = new PusherServer({
  appId: env.PUSHER_APP_ID,
  key: env.NEXT_PUBLIC_PUSHER_KEY,
  secret: env.PUSHER_SECRET,
  cluster: env.NEXT_PUBLIC_PUSHER_CLUSTER,
  useTLS: true,
});

// const pub = {
//   fileChunkingProgress: {
//     trigger: (
//       userId: string,
//       message: z.infer<typeof pusherMessages.fileChunkingProgress>,
//     ) => {

//     },
//   },
// };

export default pusher;

// await pusher.trigger(ctx.session.user.id, "file-chunked", {
//   fileId: input.fileId,
//   chunkingProgress: 100,
//   chunkingCompleted: true,
// });
