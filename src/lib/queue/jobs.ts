/**
 * Job payload shapes. Deliberately minimal — the worker reloads fresh state
 * (delivery row, email account, message template) at execution time rather
 * than trusting a stale enqueue-time snapshot.
 */
export type EmailDeliveryJob = { deliveryId: string };
