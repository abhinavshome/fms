import { z } from "zod";

// 1. Define the schema
const CreateSOPSchema = z.object({
    title: z.string(),
    objective: z.string(),
    scope: z.string(),
    accountabilityId: z.number().int().positive(),
    responsibilityIds: z.array(z.number().int().positive())
});

// 2. Extract the TypeScript type automatically
type User = z.infer<typeof UserSchema>;

// Data to validate
const incomingData = {
  id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  username: "johndoe",
  email: "john@example.com",
};
