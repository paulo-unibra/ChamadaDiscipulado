import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    await this.schema.raw(`
      CREATE TABLE IF NOT EXISTS mcp_oauth_clients (
        client_id varchar(64) NOT NULL,
        client_name varchar(120) NOT NULL,
        redirect_uris text NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (client_id)
      ) ENGINE=InnoDB
    `)
    await this.schema.raw(`
      CREATE TABLE IF NOT EXISTS mcp_oauth_flows (
        flow_hash char(64) NOT NULL,
        client_id varchar(64) NOT NULL,
        redirect_uri varchar(2048) NOT NULL,
        state varchar(1024) NULL,
        code_challenge char(43) NOT NULL,
        scopes varchar(255) NOT NULL,
        resource varchar(512) NOT NULL,
        login_challenge_id varchar(36) NULL,
        subject varchar(254) NULL,
        expires_at timestamp NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (flow_hash),
        INDEX mcp_oauth_flows_expires_at_idx (expires_at)
      ) ENGINE=InnoDB
    `)
    await this.schema.raw(`
      CREATE TABLE IF NOT EXISTS mcp_oauth_codes (
        code_hash char(64) NOT NULL,
        client_id varchar(64) NOT NULL,
        subject varchar(254) NOT NULL,
        redirect_uri varchar(2048) NOT NULL,
        code_challenge char(43) NOT NULL,
        scopes varchar(255) NOT NULL,
        resource varchar(512) NOT NULL,
        expires_at timestamp NOT NULL,
        used_at timestamp NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (code_hash),
        INDEX mcp_oauth_codes_expires_at_idx (expires_at)
      ) ENGINE=InnoDB
    `)
    await this.schema.raw(`
      CREATE TABLE IF NOT EXISTS mcp_oauth_tokens (
        id char(36) NOT NULL,
        token_hash char(64) NOT NULL,
        token_type varchar(16) NOT NULL,
        family_id char(36) NOT NULL,
        client_id varchar(64) NOT NULL,
        subject varchar(254) NOT NULL,
        scopes varchar(255) NOT NULL,
        resource varchar(512) NOT NULL,
        expires_at timestamp NOT NULL,
        revoked_at timestamp NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY mcp_oauth_tokens_hash_unique (token_hash),
        INDEX mcp_oauth_tokens_family_idx (family_id),
        INDEX mcp_oauth_tokens_subject_idx (subject, revoked_at)
      ) ENGINE=InnoDB
    `)
    await this.schema.raw(`
      CREATE TABLE IF NOT EXISTS admin_congregations (
        admin_email varchar(254) NOT NULL,
        congregation_id varchar(36) NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (admin_email, congregation_id),
        CONSTRAINT admin_congregations_admin_fk FOREIGN KEY (admin_email) REFERENCES admin_credentials(email) ON DELETE CASCADE,
        CONSTRAINT admin_congregations_congregation_fk FOREIGN KEY (congregation_id) REFERENCES congregations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `)
    await this.schema.raw(`
      INSERT IGNORE INTO admin_congregations (admin_email, congregation_id)
      SELECT admin_credentials.email, congregations.id
      FROM admin_credentials CROSS JOIN congregations
    `)
  }

  async down() {
    await this.schema.dropTableIfExists('admin_congregations')
    await this.schema.dropTableIfExists('mcp_oauth_tokens')
    await this.schema.dropTableIfExists('mcp_oauth_codes')
    await this.schema.dropTableIfExists('mcp_oauth_flows')
    await this.schema.dropTableIfExists('mcp_oauth_clients')
  }
}
