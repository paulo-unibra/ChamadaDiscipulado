import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'api_rate_limits'

  async up() {
    await this.schema.raw(
      'CREATE TABLE IF NOT EXISTS api_rate_limits (`key` varchar(191) NOT NULL, attempts int unsigned NOT NULL DEFAULT 0, reset_at timestamp NOT NULL, PRIMARY KEY (`key`)) ENGINE=InnoDB'
    )
  }

  async down() {
    await this.schema.dropTableIfExists(this.tableName)
  }
}
