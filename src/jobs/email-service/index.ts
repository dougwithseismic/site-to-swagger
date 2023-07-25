import { Job } from 'bullmq'
import { createWorker, createQueue } from '../utility'

export interface EmailJobData {
    to: string
    from: string
    subject: string
    body: string
}

const EMAIL_JOB_NAME = 'send-email'

export const emailQueue = createQueue<EmailJobData>(EMAIL_JOB_NAME)

export const emailWorker = createWorker<EmailJobData>(EMAIL_JOB_NAME, async (job) => {
    console.log(`Sending email to: ${job.data.to}`)
})

export const addEmailJobToQueue = async (data: EmailJobData) => {
    await emailQueue.add('send-email', data)
}

// LIFECYCLE HOOKS
// https://docs.bullmq.io/guide/events

emailWorker.on('completed', (job: Job<EmailJobData> | undefined) => {
    if (job) {
        console.log(`Job with id ${job.id} has been completed`)
    } else {
        console.log('Completed job is undefined')
    }
})

emailWorker.on('failed', (job: Job<EmailJobData> | undefined, err: Error) => {
    if (job) {
        console.log(`Job with id ${job.id} has failed with error ${err.message}`)
    } else {
        console.log(`Failed job is undefined, error: ${err.message}`)
    }
})
