import vine from '@vinejs/vine'

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().maxLength(254),
    password: vine.string().minLength(1).maxLength(256),
  })
)

export const verifyLoginValidator = vine.compile(
  vine.object({
    challenge: vine.string().trim().minLength(1).maxLength(64),
    code: vine
      .string()
      .trim()
      .regex(/^\d{6}$/),
  })
)

export const changePasswordValidator = vine.compile(
  vine.object({
    currentPassword: vine.string().minLength(1).maxLength(256),
    newPassword: vine.string().minLength(12).maxLength(256),
  })
)
