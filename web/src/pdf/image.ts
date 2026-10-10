export async function loadPdfLogo(source: string): Promise<{ data: string; aspectRatio: number } | null> {
  if (!source) return null;
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Não foi possível carregar a logo configurada.'));
    element.src = source;
  });
  const canvas = document.createElement('canvas');
  const ratio = Math.min(1, 640 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível preparar a logo para o PDF.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { data: canvas.toDataURL('image/png'), aspectRatio: canvas.width / canvas.height };
}
