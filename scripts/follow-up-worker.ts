import { config } from "dotenv";

config({ path: ".env.local" });

import { processDueFollowUps } from "../lib/follow-ups/process-due";

async function main() {
  const limit = Number(process.env.FOLLOW_UP_BATCH_SIZE ?? "50");
  const result = await processDueFollowUps(limit);
  console.log(JSON.stringify({ at: new Date().toISOString(), ...result }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
