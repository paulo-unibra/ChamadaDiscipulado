import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    await this.schema.raw(`
      CREATE TABLE IF NOT EXISTS admin_credentials (
        email varchar(254) NOT NULL,
        password_hash varchar(255) NOT NULL,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (email)
      ) ENGINE=InnoDB
    `)
    await this.schema.raw(`
      CREATE TABLE IF NOT EXISTS api_login_challenges (
        id varchar(36) NOT NULL,
        email varchar(254) NOT NULL,
        code_hash varchar(255) NOT NULL,
        expires_at timestamp NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX api_login_challenges_expires_at_index (expires_at)
      ) ENGINE=InnoDB
    `)
  }

  async down() {
    await this.schema.dropTableIfExists('api_login_challenges')
    await this.schema.dropTableIfExists('admin_credentials')
  }
}
