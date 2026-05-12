import env from '#start/env'
import * as coreEncryption from '@adonisjs/core/encryption'
import * as packageEncryption from '@adonisjs/encryption'

type EncryptionConfig = {
  secret: string
}

type DefineConfig = (config: EncryptionConfig) => unknown

const defineConfig =
  (coreEncryption as { defineConfig?: DefineConfig }).defineConfig ??
  (packageEncryption as { defineConfig?: DefineConfig }).defineConfig

const config: EncryptionConfig = {
  secret: env.get('APP_KEY'),
}

export default defineConfig ? defineConfig(config) : config
