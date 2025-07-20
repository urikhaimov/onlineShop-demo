export function loadGoogleFont(font: string) {
  if (!font) return;

  const fontName = font.split(',')[0].trim().replace(/\s+/g, '+');
  const fontUrl = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;700&display=swap`;

  const existing = document.querySelector(`link[href="${fontUrl}"]`);
  if (!existing) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontUrl;
    document.head.appendChild(link);
  }
}
