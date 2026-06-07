/** Simulate network latency so loading skeletons are visible in the prototype. */
export function delay(ms = 600): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
