import { test } from '@japa/runner'
import { validateQuizQuestions } from '#services/quiz_service'

const question = {
  question: ' Qual é a resposta? ',
  options: ['Primeira', 'Segunda', 'Terceira', 'Quarta'],
  correctAnswer: 'B',
}

test.group('Questionários recebidos pelo MCP', () => {
  test('preserves supplied questions and answer key without generating content', ({ assert }) => {
    assert.deepEqual(validateQuizQuestions([question]), [
      { ...question, question: 'Qual é a resposta?', explanation: '' },
    ])
  })

  test('rejects missing questions and excessive question counts', ({ assert }) => {
    for (const value of [undefined, [], Array(31).fill(question)])
      assert.throws(() => validateQuizQuestions(value))
  })

  test('rejects invalid answer keys, empty fields and duplicated options', ({ assert }) => {
    for (const value of [
      null,
      { ...question, correctAnswer: 'E' },
      { ...question, question: ' ' },
      { ...question, options: ['Apenas uma'] },
      { ...question, options: ['A) Igual', 'B) Igual', 'C) Outra', 'D) Mais'] },
      { ...question, explanation: 123 },
    ])
      assert.throws(() => validateQuizQuestions([value]))
  })
})
