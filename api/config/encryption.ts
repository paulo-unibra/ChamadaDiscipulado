import env from '#start/env'
import * as coreEncryption from '@adonisjs/core/encryption'

const encryptionModule = coreEncryption as unknown as {
  defineConfig?: (config: unknown) => unknown
  drivers?: {
    chacha20?: (config: { id: string; keys: string[] }) => unknown
  }
}

const modernConfig =
  encryptionModule.defineConfig && encryptionModule.drivers?.chacha20
    ? encryptionModule.defineConfig({
        default: 'chacha',
        list: {
          chacha: encryptionModule.drivers.chacha20({
            id: 'chacha',
            keys: [env.get('APP_KEY')],
          }),
        },
      })
    : null

export default modernConfig ?? { secret: env.get('APP_KEY') }
