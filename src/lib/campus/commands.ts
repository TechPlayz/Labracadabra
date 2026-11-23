import { z } from "zod";

const id = z.uuid();
const timestamp = z.iso.datetime({ offset: true });

export const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("saveProject"), id: id.optional(), title: z.string().trim().min(3).max(100),
    description: z.string().trim().min(10).max(2000), deadline: z.iso.date(), progress: z.number().int().min(0).max(100),
    capabilities: z.array(z.string().trim().min(1).max(60)).max(12), team: z.array(id).max(12) }),
  z.object({ type: z.literal("request"), projectId: id, unitId: id, start: timestamp, end: timestamp,
    purpose: z.string().trim().min(10).max(1000) }),
  z.object({ type: z.literal("cancel"), id }),
  z.object({ type: z.literal("retry"), id }),
  z.object({ type: z.literal("decide"), id, decision: z.enum(["approved", "rejected", "alternative"]),
    comment: z.string().trim().max(500), suggestedStart: timestamp.optional(), suggestedUnitId: id.optional() }),
  z.object({ type: z.literal("readNotices") }),
  z.object({ type: z.literal("issuePass"), id }),
  z.object({ type: z.literal("checkVisit"), pass: id, action: z.enum(["in", "out"]) }),
  z.object({ type: z.literal("setOperational"), id, operational: z.boolean() }),
  z.object({ type: z.literal("setMaintenance"), unitId: id, start: timestamp, end: timestamp }),
]);

export type Command = z.infer<typeof commandSchema>;

export class CampusError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
