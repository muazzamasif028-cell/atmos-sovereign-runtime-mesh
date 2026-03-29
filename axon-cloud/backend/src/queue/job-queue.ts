/**
 * Axon Cloud — Job Queue
 *
 * Wraps Bull (Redis-backed) to provide a reliable async execution queue.
 * Workflow execution jobs are enqueued here and processed by workers.
 */

import Bull, { Queue, Job } from 'bull';
import { logger } from '../core/logger';
import { WorkflowEngine } from '../core/workflow-engine';
import type { WorkflowDefinition } from '../core/workflow-engine';

// ── Redis client (shared) ─────────────────────────────────────────────────────

import Redis from 'ioredis';

export const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});

redisClient.on('error', (err) => {
  logger.error('Redis client error', { message: err.message });
});

// ── Queue definition ──────────────────────────────────────────────────────────

export interface WorkflowJobData {
  workflowId: string;
  executionId: string;
  definition: WorkflowDefinition;
  triggerData?: Record<string, unknown>;
}

const QUEUE_NAME = 'axon:workflow-executions';

export const workflowQueue: Queue<WorkflowJobData> = new Bull(QUEUE_NAME, {
  redis: process.env.REDIS_URL || 'redis://localhost:6379',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

// ── Worker ────────────────────────────────────────────────────────────────────

const engine = new WorkflowEngine();

workflowQueue.process(
  Number(process.env.QUEUE_CONCURRENCY ?? 10),
  async (job: Job<WorkflowJobData>) => {
    const { workflowId, definition, triggerData } = job.data;

    logger.info('Processing workflow job', {
      jobId: job.id,
      workflowId,
    });

    await engine.execute(workflowId, definition, triggerData);
  }
);

workflowQueue.on('completed', (job) => {
  logger.info('Workflow job completed', { jobId: job.id });
});

workflowQueue.on('failed', (job, err) => {
  logger.error('Workflow job failed', {
    jobId: job.id,
    error: err.message,
    attempts: job.attemptsMade,
  });
});

workflowQueue.on('stalled', (job) => {
  logger.warn('Workflow job stalled', { jobId: job.id });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

export async function enqueueWorkflow(data: WorkflowJobData): Promise<string> {
  const job = await workflowQueue.add(data, {
    jobId: data.executionId,
  });
  return String(job.id);
}

export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    workflowQueue.getWaitingCount(),
    workflowQueue.getActiveCount(),
    workflowQueue.getCompletedCount(),
    workflowQueue.getFailedCount(),
    workflowQueue.getDelayedCount(),
  ]);
  return { waiting, active, completed, failed, delayed };
}
