type PreviousLesson = { id: string; content?: string | null; lesson_time?: string | null }

/** Retain the identity and optional fields of an existing lesson during scale edits. */
export function preserveScheduleFields(
  input: { content?: unknown; time?: unknown },
  previous?: PreviousLesson
) {
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
  return {
    content: text(input.content === undefined ? previous?.content : input.content),
    lessonTime: text(input.time === undefined ? previous?.lesson_time : input.time),
    id: previous?.id,
  }
}
