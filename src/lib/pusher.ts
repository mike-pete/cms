import PusherClient from "pusher-js";
import { z } from "zod";
import { env } from "~/env";

export const pusherClient = new PusherClient(env.NEXT_PUBLIC_PUSHER_KEY, {
  cluster: env.NEXT_PUBLIC_PUSHER_CLUSTER,
});

export const pusherEvents = {
  chunkProcessed: z.object({
    chunkingCompleted: z.boolean(),
    totalChunks: z.number(),
    doneChunks: z.number(),
    fileId: z.number(),
    createdAt: z.string(),
    fileName: z.string(),
  }),
  fileChunked: z.object({
    chunkingCompleted: z.boolean(),
    fileId: z.number(),
  }),
} as const satisfies Record<string, z.ZodSchema>;
