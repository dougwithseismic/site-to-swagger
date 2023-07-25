import { Queue, ConnectionOptions, Worker, Job } from 'bullmq'

export const connectionOpts: ConnectionOptions = {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT!),
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
}

export const createQueue = <T>(name: string) =>
    new Queue<T>(name, {
        connection: connectionOpts,
    })

export const createWorker = <T>(name: string, callback: (job: Job<T, any, string>) => void) =>
    new Worker<T>(name, async (job) => callback(job), {
        connection: connectionOpts,
    })

// Example Usage
// createWorker<EmailJobData>('email-queue')
