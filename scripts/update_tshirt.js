import fs from 'fs';

let content = fs.readFileSync('src/tshirt.ts', 'utf8');

// Update type
content = content.replace(
  export type TshirtStyle = 'crewneck' | 'polo' | 'vneck';,
  export type TshirtStyle = 'crewneck' | 'polo' | 'vneck' | 'fullhand';
);

// Add fullhand to APPAREL_STYLES
const fullhandStyle =   {
    id: 'fullhand',
    name: 'Full Hand Long Sleeve',
    hasCollar: false,
    badge: 'Without Collar',
    description: 'Heavyweight full-sleeve cotton tee with ribbed cuffs and relaxed streetwear drape.',
    frontImg: '/mockups/fullhand_front.png',
    backImg: '/mockups/fullhand_back.png'
  },
;

if (!content.includes(id: 'fullhand')) {
  content = content.replace(
    export const APPAREL_STYLES: StyleOption[] = [,
    export const APPAREL_STYLES: StyleOption[] = [\n + fullhandStyle
  );
}

// Add fullhand to PRINT_ZONES
const fullhandZone =   fullhand: {
    x: 180,
    y: 165,
    width: 240,
    height: 380
  },
;

if (!content.includes('fullhand: {')) {
  content = content.replace(
    export const PRINT_ZONES: Record<TshirtStyle, { x: number; y: number; width: number; height: number }> = {,
    export const PRINT_ZONES: Record<TshirtStyle, { x: number; y: number; width: number; height: number }> = {\n + fullhandZone
  );
}

fs.writeFileSync('src/tshirt.ts', content, 'utf8');
console.log('Updated src/tshirt.ts successfully');