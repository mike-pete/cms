import PusherClient from "pusher-js";
import { z } from "zod";
import { env } from "~/env";

const pusherClient = new PusherClient(env.NEXT_PUBLIC_PUSHER_KEY, {
  cluster: env.NEXT_PUBLIC_PUSHER_CLUSTER,
});

// export const pusherMessages: Record<string, z.ZodType> = {
//   chunkQueued: z.object({
//     fileId: z.number(),
//     chunkingCompletionPercentage: z.number(),
//     chunkingCompleted: z.boolean(),
//   }),
//   chunkProcessed: z.object({
//     fileId: z.number(),
//     chunkingProgress: z.number(),
//     chunkingCompleted: z.boolean(),
//   }),
// };

// type FileChunkingProgress = z.infer<typeof pusherMessages.fileChunkingProgress>;

export default pusherClient;
