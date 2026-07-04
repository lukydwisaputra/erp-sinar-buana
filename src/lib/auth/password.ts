import { hash, verify } from "@node-rs/argon2";

// Default algorithm is already Argon2id (docs/architecture.md §5).
export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export function verifyPassword(hashed: string, password: string): Promise<boolean> {
  return verify(hashed, password);
}
