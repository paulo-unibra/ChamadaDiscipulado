import { describe, expect, it } from 'vitest';
import { createQuizPdf } from './quiz';
import type { Quiz } from '../types';

function quiz(count: number, long = false): Quiz {
  return { id: 'quiz-1', scheduleId: 'lesson-1', classId: 'class-1', provider: 'deepseek', status: 'completed', createdAt: '2026-10-10', error: '', lessonTitle: 'Lição de teste', questions: Array.from({ length: count }, (_, index) => ({ question: `Questão ${index + 1}: qual a resposta?`, options: ['A) ' + (long ? 'Esta alternativa ocupa várias linhas e precisa permanecer dentro da página. '.repeat(8) : 'Resposta A'), 'B) Resposta B', 'C) Resposta C', 'D) Resposta D'], correctAnswer: 'A', explanation: '' })) };
}

describe('PDF do questionário', () => {
  it('gera paisagem com cabeçalho na primeira página e todas as questões', async () => {
    const pdf = await createQuizPdf(quiz(10), { id: 'cong', name: 'Congregação de teste' });
    expect(pdf.internal.pageSize.getWidth()).toBeGreaterThan(pdf.internal.pageSize.getHeight());
    const output = pdf.output();
    expect(output).toContain('Aluno\\(a\\)');
    expect(output).toContain('Lição de teste');
    for (let index = 1; index <= 10; index += 1) expect(output).toContain(`Questão ${index}:`);
  });

  it('não deixa texto fora das margens com alternativas multilinha em várias páginas', async () => {
    const pdf = await createQuizPdf(quiz(30, true), { id: 'cong', name: 'Congregação de teste' });
    expect(pdf.getNumberOfPages()).toBeGreaterThan(1);
    const output = pdf.output();
    const positions = [...output.matchAll(/([\d.-]+) ([\d.-]+) Td/g)].map((match) => [Number(match[1]), Number(match[2])]);
    expect(positions.length).toBeGreaterThan(100);
    const pageHeightPt = pdf.internal.pageSize.getHeight() * pdf.internal.scaleFactor;
    for (const [x, y] of positions) {
      expect(x).toBeGreaterThanOrEqual(28);
      expect(y).toBeGreaterThan(20);
      expect(y).toBeLessThan(pageHeightPt);
    }
    expect(output).toContain('30. Questão 30:');
  });

  it('acomoda títulos longos e uma questão maior que uma coluna sem cortar o texto', async () => {
    const content = quiz(1, true);
    content.lessonTitle = 'Título extenso da lição para verificar a quebra no cabeçalho '.repeat(5);
    content.questions[0].options[0] = 'A) ' + 'Conteúdo longo para verificar continuação em outra coluna sem corte. '.repeat(100);
    const pdf = await createQuizPdf(content, { id: 'cong', name: 'Congregação de teste' });
    const output = pdf.output();
    expect(pdf.getNumberOfPages()).toBeGreaterThan(1);
    expect(output).toContain('D\\) Resposta D');
    const positions = [...output.matchAll(/([\d.-]+) ([\d.-]+) Td/g)].map((match) => Number(match[2]));
    expect(Math.min(...positions)).toBeGreaterThan(20);
  });
});
