import { randomUUID } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import type { QueryClientContract } from '@adonisjs/lucid/types/database'
import { CONVERSION_EVENTS } from '#services/conversion_events'

export class NewConvertValidationError extends Error {}

function requiredText(value: unknown, field: string, maxLength: number) {
  if (typeof value !== 'string') throw new NewConvertValidationError(`${field} é obrigatório.`)
  const result = value.trim()
  if (!result || result.length > maxLength) {
    throw new NewConvertValidationError(`${field} deve ter entre 1 e ${maxLength} caracteres.`)
  }
  return result
}

function optionalText(value: unknown, field: string, maxLength = 255) {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value !== 'string') throw new NewConvertValidationError(`${field} deve ser texto.`)
  const result = value.trim()
  if (result.length > maxLength) {
    throw new NewConvertValidationError(`${field} deve ter no máximo ${maxLength} caracteres.`)
  }
  return result
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function validateNewConvert(input: Record<string, unknown>) {
  const name = requiredText(input.name, 'Nome', 255)
  const eventName = requiredText(input.eventName, 'Atividade', 255)
  const conversionDate = requiredText(input.conversionDate, 'Data da conversão', 10)
  const birthDate = optionalText(input.birthDate, 'Data de nascimento', 10)
  const rawCep = optionalText(input.cep, 'CEP', 20)
  const cep = rawCep.replace(/\D/g, '')
  const street = optionalText(input.street, 'Rua')
  const number = optionalText(input.number, 'Número')
  const complement = optionalText(input.complement, 'Complemento')
  const neighborhood = optionalText(input.neighborhood, 'Bairro')
  const city = optionalText(input.city, 'Cidade')
  const state = optionalText(input.state, 'Estado', 2).toUpperCase()
  const contactPhone = optionalText(input.contactPhone, 'Telefone', 40)

  if (!CONVERSION_EVENTS.includes(eventName as (typeof CONVERSION_EVENTS)[number])) {
    throw new NewConvertValidationError('Selecione uma atividade válida da lista disponível.')
  }
  if (!validDate(conversionDate) || (birthDate && !validDate(birthDate))) {
    throw new NewConvertValidationError('Informe datas válidas no formato AAAA-MM-DD.')
  }
  if (birthDate && birthDate > conversionDate) {
    throw new NewConvertValidationError('A data de nascimento não pode ser posterior à conversão.')
  }
  if (cep && cep.length !== 8) throw new NewConvertValidationError('O CEP deve conter 8 dígitos.')

  return {
    name,
    eventName,
    conversionDate,
    birthDate,
    cep,
    street,
    number,
    complement,
    neighborhood,
    city,
    state,
    contactPhone,
  }
}

export async function createNewConvert(
  connection: typeof db | QueryClientContract,
  input: Record<string, unknown>,
  congregationId: string
) {
  const payload = validateNewConvert(input)
  const congregation = await connection.from('congregations').where('id', congregationId).first()
  if (!congregation) throw new NewConvertValidationError('A congregação autorizada não existe.')

  const newConvertId = randomUUID()
  await connection.table('new_converts').insert({
    id: newConvertId,
    congregation_id: congregationId,
    event_name: payload.eventName,
    name: payload.name,
    conversion_date: payload.conversionDate,
    cep: payload.cep || null,
    street: payload.street || null,
    number: payload.number || null,
    complement: payload.complement || null,
    neighborhood: payload.neighborhood || null,
    city: payload.city || null,
    state: payload.state || null,
    birth_date: payload.birthDate || null,
    contact_phone: payload.contactPhone || null,
  })
  return { id: newConvertId, congregationId, ...payload }
}
