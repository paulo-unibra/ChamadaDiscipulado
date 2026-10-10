import { test } from '@japa/runner'
import { preserveScheduleFields } from '#services/schedule_fields_service'

test.group('Scale lesson preservation', () => {
  test('retains lesson identity, content and custom time when fields are omitted', ({ assert }) => {
    const saved = {
      id: 'lesson-linked-to-quiz',
      content: 'Conteúdo da lição',
      lesson_time: '10:30',
    }
    assert.deepEqual(preserveScheduleFields({}, saved), {
      id: 'lesson-linked-to-quiz',
      content: 'Conteúdo da lição',
      lessonTime: '10:30',
    })
  })

  test('allows explicit clearing without replacing the identity', ({ assert }) => {
    assert.deepEqual(
      preserveScheduleFields(
        { content: '', time: '' },
        {
          id: 'lesson-linked-to-quiz',
          content: 'Texto antigo',
          lesson_time: '10:30',
        }
      ),
      { id: 'lesson-linked-to-quiz', content: '', lessonTime: '' }
    )
  })

  test('accepts new content while retaining the saved custom time', ({ assert }) => {
    assert.deepEqual(
      preserveScheduleFields(
        { content: ' Novo conteúdo ' },
        {
          id: 'lesson-linked-to-quiz',
          content: 'Texto antigo',
          lesson_time: '10:30',
        }
      ),
      { id: 'lesson-linked-to-quiz', content: 'Novo conteúdo', lessonTime: '10:30' }
    )
  })
})
