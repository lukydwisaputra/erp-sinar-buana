import { setDefaultResultOrder } from "node:dns";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/env";

// Coolify's internal Docker network resolves container hostnames (e.g.
// "postgres") to both an IPv4 and an IPv6 (ULA) address, but the network's
// IPv6 path isn't actually routed — connecting over it fails with
// ECONNREFUSED even though the container is healthy and IPv4 works fine.
// Node prefers whichever address family the DNS answer lists first, which is
// often IPv6; force IPv4 first so it always picks the address that works.
setDefaultResultOrder("ipv4first");

const queryClient = postgres(env.DATABASE_URL);

export const db = drizzle(queryClient, { schema });

export { schema, queryClient };
