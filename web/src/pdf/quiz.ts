import { jsPDF } from 'jspdf';
import type { Congregation, Quiz } from '../types';
import { loadPdfLogo } from './image';

interface Line {
  text: string;
  bold: boolean;
  indent: number;
  advance: number;
}
interface Block { lines: Line[]; height: number }
interface Column { blocks: Block[]; height: number }
interface Page { startY: number; columns: [Column, Column] }

export async function createQuizPdf(quiz: Quiz, congregation: Congregation, logoLoader = loadPdfLogo) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const width = pdf.internal.pageSize.getWidth(), height = pdf.internal.pageSize.getHeight();
  const margin = 10, gutter = 8, columnWidth = (width - margin * 2 - gutter) / 2, bottom = height - margin;
  const logo = await logoLoader(congregation.logoData || '');
  const titleX = logo ? margin + 29 : margin;
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(17);
  const titleLines: string[] = pdf.splitTextToSize(quiz.lessonTitle, width - titleX - margin);
  const subtitleY = 17 + Math.max(0, titleLines.length - 1) * 7 + 6;
  const divider = Math.max(33, subtitleY + 5);
  const firstStart = divider + 15, otherStart = divider + 8;
  const newPage = (startY: number): Page => ({ startY, columns: [{ blocks: [], height: 0 }, { blocks: [], height: 0 }] });
  const pages: Page[] = [newPage(firstStart)];
  let page = pages[0], columnIndex = 0;

  function nextColumn() {
    if (columnIndex === 0) { columnIndex = 1; return; }
    page = newPage(otherStart); pages.push(page); columnIndex = 0;
  }
  function place(block: Block) {
    let column = page.columns[columnIndex];
    const capacity = bottom - page.startY;
    if (block.height <= capacity) {
      if (column.height + block.height > capacity) { nextColumn(); column = page.columns[columnIndex]; }
      column.blocks.push(block); column.height += block.height;
      return;
    }
    // An unusually long question can continue in the next column without clipping.
    for (const line of block.lines) {
      column = page.columns[columnIndex];
      if (column.height + line.advance + 5 > bottom - page.startY) { nextColumn(); column = page.columns[columnIndex]; }
      const last = column.blocks.at(-1);
      if (last && last.height > 0) { last.lines.push(line); last.height += line.advance; }
      else column.blocks.push({ lines: [line], height: line.advance });
      column.height += line.advance;
    }
    column = page.columns[columnIndex];
    column.height += 5;
    const last = column.blocks.at(-1);
    if (last) last.height += 5;
  }

  quiz.questions.forEach((question, index) => {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9.5);
    const prompt: string[] = pdf.splitTextToSize(`${index + 1}. ${question.question}`, columnWidth);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8);
    const options: string[][] = question.options.map((option) => pdf.splitTextToSize(option, columnWidth - 3));
    const lines: Line[] = prompt.map((text, lineIndex) => ({ text, bold: true, indent: 0, advance: 4 + (lineIndex === prompt.length - 1 ? 2 : 0) }));
    for (const option of options) lines.push(...option.map((text) => ({ text, bold: false, indent: 3, advance: 3.5 })));
    place({ lines, height: lines.reduce((total, line) => total + line.advance, 5) });
  });

  pages.forEach((current, pageIndex) => {
    if (pageIndex > 0) pdf.addPage('a4', 'landscape');
    if (logo) {
      const logoWidth = Math.min(24, 24 * logo.aspectRatio), logoHeight = logoWidth / logo.aspectRatio;
      pdf.addImage(logo.data, 'PNG', margin + (24 - logoWidth) / 2, 7 + (24 - logoHeight) / 2, logoWidth, logoHeight);
    }
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(17); pdf.setTextColor(18, 47, 33);
    titleLines.forEach((line, index) => pdf.text(line, titleX, 17 + index * 7));
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(90, 105, 97);
    pdf.text(congregation.name || 'Campanha Evangelizadora', titleX, subtitleY);
    if (pageIndex === 0) pdf.text('Aluno(a): ______________________________________________', titleX, divider + 2);
    pdf.setDrawColor(218, 229, 221); pdf.line(margin, current.startY - 8, width - margin, current.startY - 8);
    current.columns.forEach((column, index) => {
      const x = margin + index * (columnWidth + gutter);
      const extraGap = column.blocks.length > 1 ? Math.max(0, (bottom - current.startY - column.height) / (column.blocks.length - 1)) : 0;
      let y = current.startY;
      for (const block of column.blocks) {
        for (const line of block.lines) {
          pdf.setFont('helvetica', line.bold ? 'bold' : 'normal'); pdf.setFontSize(line.bold ? 9.5 : 8);
          pdf.setTextColor(...(line.bold ? [22, 41, 31] : [57, 69, 62]) as [number, number, number]);
          pdf.text(line.text, x + line.indent, y); y += line.advance;
        }
        y += 5 + extraGap;
      }
    });
  });
  return pdf;
}
