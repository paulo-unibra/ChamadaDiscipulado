import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'auth_access_tokens'

  async up() {
    await this.schema.raw(`
      CREATE TABLE IF NOT EXISTS auth_access_tokens (
        id int unsigned NOT NULL AUTO_INCREMENT,
        tokenable_id varchar(254) NOT NULL,
        type varchar(255) NOT NULL,
        name varchar(255) NULL,
        hash varchar(64) NOT NULL,
        abilities json NOT NULL,
        created_at timestamp NOT NULL,
        updated_at timestamp NOT NULL,
        last_used_at timestamp NULL,
        expires_at timestamp NULL,
        PRIMARY KEY (id),
        INDEX auth_access_tokens_tokenable_id_type_index (tokenable_id, type),
        CONSTRAINT auth_access_tokens_tokenable_id_foreign
          FOREIGN KEY (tokenable_id) REFERENCES admin_credentials(email) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `)
  }

  async down() {
    await this.schema.dropTableIfExists(this.tableName)
  }
}
