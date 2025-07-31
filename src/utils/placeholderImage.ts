// Create a simple 1x1 transparent placeholder SVG for missing images
export const createPlaceholderImage = (width: number = 200, height: number = 280): string => {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--muted-foreground))" stroke-width="0.5" opacity="0.3"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="hsl(var(--muted))"/>
      <rect width="100%" height="100%" fill="url(#grid)"/>
      <g transform="translate(${width/2}, ${height/2})">
        <circle cx="0" cy="-10" r="20" fill="hsl(var(--muted-foreground))" opacity="0.4"/>
        <path d="M -8 -16 L 8 -16 L 8 -4 L -8 -4 Z" fill="white" opacity="0.8"/>
        <circle cx="-4" cy="-12" r="1.5" fill="hsl(var(--muted-foreground))"/>
        <circle cx="4" cy="-12" r="1.5" fill="hsl(var(--muted-foreground))"/>
        <path d="M -2 -8 Q 0 -6 2 -8" stroke="hsl(var(--muted-foreground))" stroke-width="1" fill="none"/>
        <text x="0" y="20" text-anchor="middle" font-size="12" fill="hsl(var(--muted-foreground))" font-family="system-ui">
          Image Not Found
        </text>
      </g>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};