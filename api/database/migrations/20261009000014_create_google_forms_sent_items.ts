import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    await this.schema.raw(`
      CREATE TABLE IF NOT EXISTS google_forms_sent_items (
        congregation_id varchar(36) NOT NULL,
        form_id varchar(255) NOT NULL,
        section_id varchar(40) NOT NULL,
        record_id varchar(36) NOT NULL,
        sent_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (congregation_id, form_id, section_id, record_id),
        INDEX google_forms_sent_items_congregation_sent_at_index (congregation_id, sent_at),
        CONSTRAINT google_forms_sent_items_congregation_id_foreign
          FOREIGN KEY (congregation_id) REFERENCES congregations(id)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `)
  }

  async down() {
    await this.schema.dropTableIfExists('google_forms_sent_items')
  }
}
