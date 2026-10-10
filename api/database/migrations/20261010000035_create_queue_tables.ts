import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  private isTableExistsError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ER_TABLE_EXISTS_ERROR'
    )
  }

  async up() {
    if (!(await this.schema.hasTable('queue_jobs'))) {
      try {
        await this.schema.createTable('queue_jobs', (table) => {
          table.string('id', 255).notNullable()
          table.string('queue', 255).notNullable()
          table.enu('status', ['pending', 'active', 'delayed', 'completed', 'failed']).notNullable()
          table.text('data').notNullable()
          table.bigint('score').unsigned().nullable()
          table.string('worker_id', 255).nullable()
          table.bigint('acquired_at').unsigned().nullable()
          table.bigint('execute_at').unsigned().nullable()
          table.bigint('finished_at').unsigned().nullable()
          table.text('error').nullable()
          table.primary(['id', 'queue'])
          table.index(['queue', 'status', 'score'])
          table.index(['queue', 'status', 'execute_at'])
          table.index(['queue', 'status', 'finished_at'])
        })
      } catch (error) {
        if (!this.isTableExistsError(error) || !(await this.schema.hasTable('queue_jobs'))) {
          throw error
        }
      }
    }
    if (!(await this.schema.hasTable('queue_schedules'))) {
      try {
        await this.schema.createTable('queue_schedules', (table) => {
          table.string('id', 255).primary()
          table.string('status', 50).notNullable().defaultTo('active')
          table.string('name', 255).notNullable()
          table.text('payload').notNullable()
          table.string('cron_expression', 255).nullable()
          table.bigint('every_ms').unsigned().nullable()
          table.string('timezone', 100).notNullable().defaultTo('UTC')
          table.timestamp('from_date').nullable()
          table.timestamp('to_date').nullable()
          table.integer('run_limit').unsigned().nullable()
          table.integer('run_count').unsigned().notNullable().defaultTo(0)
          table.timestamp('next_run_at').nullable()
          table.timestamp('last_run_at').nullable()
          table.timestamp('created_at').notNullable().defaultTo(this.now())
          table.index(['status', 'next_run_at'])
        })
      } catch (error) {
        if (!this.isTableExistsError(error) || !(await this.schema.hasTable('queue_schedules'))) {
          throw error
        }
      }
    }
  }

  async down() {
    await this.schema.dropTable('queue_schedules')
    await this.schema.dropTable('queue_jobs')
  }
}
