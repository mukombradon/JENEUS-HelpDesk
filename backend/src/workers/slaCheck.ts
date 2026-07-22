import { Worker, Queue } from 'bullmq';
import config from '../config';

// ---------------------------------------------------------------------------
// Queue definitions
// ---------------------------------------------------------------------------

/**
 * BullMQ connection config — uses a connection string to avoid
 * ioredis type conflicts between BullMQ's bundled ioredis and the
 * top-level ioredis package.
 */
const connection = {
  url: config.redis.url,
};

export const slaCheckQueue = new Queue('sla-check', { connection });

// ---------------------------------------------------------------------------
// Worker — runs SLA checks on tickets
// ---------------------------------------------------------------------------

const worker = new Worker(
  'sla-check',
  async (job) => {
    const { ticketId, ticketNumber } = job.data;
    console.log(`[SLA Worker] Processing job ${job.id}: ticket ${ticketNumber} (${ticketId})`);
    // -- Placeholder: actual SLA breach / warning logic goes here --
    // Steps to add later:
    //  1. Fetch ticket with its SLA policy
    //  2. Compare resolutionDueAt / responseDueAt against now
    //  3. Update `slaBreach` flag if overdue
    //  4. Create notifications for sla_warning / sla_breached
    return { status: 'processed', ticketId, ticketNumber };
  },
  {
    connection,
    concurrency: 5,
    limiter: { max: 10, duration: 1000 },
  },
);

worker.on('completed', (job) => {
  console.log(`[SLA Worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[SLA Worker] Job ${job?.id} failed:`, err.message);
});

console.log('[SLA Worker] Initialized');
