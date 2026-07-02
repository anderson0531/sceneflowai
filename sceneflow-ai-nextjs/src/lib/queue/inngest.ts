/**
 * Re-export the real Inngest client for server-side job enqueue.
 * The legacy mock in this file has been replaced by @/inngest/client.
 */
export { inngest } from '@/inngest/client'
