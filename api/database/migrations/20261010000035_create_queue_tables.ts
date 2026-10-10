import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  private async ensureIndex(tableName: string, indexName: string, columns: string[]) {
    const columnSql = columns.map((column) => `\`${column}\``).join(', ')
    try {
      await this.schema.raw(
        `ALTER TABLE \`${tableName}\` ADD INDEX \`${indexName}\` (${columnSql})`
      )
    } catch (error) {
      if (
        typeof error !== 'object' ||
        error === null ||
        !('code' in error) ||
        error.code !== 'ER_DUP_KEYNAME'
      ) {
        throw error
      }
    }
  }

  async up() {
    await this.schema.raw(`
      CREATE TABLE IF NOT EXISTS queue_jobs (
        id varchar(255) NOT NULL,
        queue varchar(255) NOT NULL,
        status enum('pending', 'active', 'delayed', 'completed', 'failed') NOT NULL,
        data text NOT NULL,
        score bigint unsigned NULL,
        worker_id varchar(255) NULL,
        acquired_at bigint unsigned NULL,
        execute_at bigint unsigned NULL,
        finished_at bigint unsigned NULL,
        error text NULL,
        PRIMARY KEY (id, queue),
        INDEX queue_jobs_queue_status_score_index (queue, status, score),
        INDEX queue_jobs_queue_status_execute_at_index (queue, status, execute_at),
        INDEX queue_jobs_queue_status_finished_at_index (queue, status, finished_at)
      ) ENGINE=InnoDB
    `)
    await this.ensureIndex('queue_jobs', 'queue_jobs_queue_status_score_index', [
      'queue',
      'status',
      'score',
    ])
    await this.ensureIndex('queue_jobs', 'queue_jobs_queue_status_execute_at_index', [
      'queue',
      'status',
      'execute_at',
    ])
    await this.ensureIndex('queue_jobs', 'queue_jobs_queue_status_finished_at_index', [
      'queue',
      'status',
      'finished_at',
    ])
    await this.schema.raw(`
      CREATE TABLE IF NOT EXISTS queue_schedules (
        id varchar(255) NOT NULL,
        status varchar(50) NOT NULL DEFAULT 'active',
        name varchar(255) NOT NULL,
        payload text NOT NULL,
        cron_expression varchar(255) NULL,
        every_ms bigint unsigned NULL,
        timezone varchar(100) NOT NULL DEFAULT 'UTC',
        from_date timestamp NULL,
        to_date timestamp NULL,
        run_limit int unsigned NULL,
        run_count int unsigned NOT NULL DEFAULT 0,
        next_run_at timestamp NULL,
        last_run_at timestamp NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX queue_schedules_status_next_run_at_index (status, next_run_at)
      ) ENGINE=InnoDB
    `)
    await this.ensureIndex('queue_schedules', 'queue_schedules_status_next_run_at_index', [
      'status',
      'next_run_at',
    ])
  }

  async down() {
    await this.schema.dropTable('queue_schedules')
    await this.schema.dropTable('queue_jobs')
  }
}
