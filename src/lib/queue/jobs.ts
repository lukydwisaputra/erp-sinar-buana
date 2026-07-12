/**
 * Job payload shapes. Deliberately minimal — the worker reloads fresh state
 * (delivery row, email account, message template) at execution time rather
 * than trusting a stale enqueue-time snapshot.
 */
export type EmailDeliveryJob = { deliveryId: string };

/** Password-reset link email — no owning business document, so it skips the
 * document_deliveries/message_templates pipeline entirely (see PASSWORD_RESET_EMAIL_QUEUE). */
export type PasswordResetEmailJob = { to: string; resetUrl: string };
