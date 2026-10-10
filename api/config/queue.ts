import env from '#start/env'
import { defineConfig, drivers } from '@adonisjs/queue'

const configuredDriver = env.get('QUEUE_DRIVER')
if (configuredDriver && configuredDriver !== 'database' && configuredDriver !== 'sync') {
  throw new Error('QUEUE_DRIVER deve ser "database" ou "sync".')
}

const queueConfig = defineConfig({
  default:
    env.get('NODE_ENV') === 'test' || env.get('QUEUE_DRIVER') === 'sync' ? 'sync' : 'database',
  adapters: {
    database: drivers.database({ connectionName: 'mysql' }),
    sync: drivers.sync(),
  },
  worker: {
    concurrency: 3,
    idleDelay: '2s',
    gracefulShutdown: true,
  },
  retry: {
    maxRetries: 3,
  },
  locations: ['./app/jobs/**/*.ts'],
})

export default queueConfig
