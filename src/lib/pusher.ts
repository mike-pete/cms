import PusherClient from "pusher-js";
import { z } from "zod";
import { env } from "~/env";

export const pusherClient = new PusherClient(env.NEXT_PUBLIC_PUSHER_KEY, {
  cluster: env.NEXT_PUBLIC_PUSHER_CLUSTER,
});

export const pusherEvents = {
  chunkProcessed: z.object({
    fileId: z.number(),
    totalChunks: z.number(),
    doneChunks: z.number(),
    fileName: z.string(),
    createdAt: z.string().datetime(),
  }),
  fileChunked: z.object({
    totalChunks: z.number(),
    doneChunks: z.number(),
    fileName: z.string(),
    createdAt: z.string().datetime(),
    fileId: z.number(),
  }),
} as const satisfies Record<string, z.ZodSchema>;