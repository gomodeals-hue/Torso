// Authentic 3D Vinyl Toy Stickers Catalog for T-Shirt Customizer

export interface StickerDef {
  id: string;
  name: string;
  category: 'nature' | 'streetwear' | 'robots' | 'animals' | 'gaming' | 'space' | 'street' | 'vintage';
  imgUrl: string;
  badge?: string;
}

export const TOY_STICKERS: StickerDef[] = [
  // 0. Natural Botanicals, Aesthetic Outdoors & Organic Art
  {
    id: 'wildflower-bouquet',
    name: 'Wildflower Bouquet',
    category: 'nature',
    imgUrl: '/stickers/wildflower_bouquet.png',
    badge: 'Botanical DTG'
  },
  {
    id: 'japanese-bonsai',
    name: 'Japanese Bonsai',
    category: 'nature',
    imgUrl: '/stickers/japanese_bonsai.png',
    badge: 'Zen Botanical'
  },
  {
    id: 'pacific-northwest',
    name: 'Pacific Northwest',
    category: 'nature',
    imgUrl: '/stickers/pacific_northwest.png',
    badge: 'Outdoor Badge'
  },
  {
    id: 'celestial-butterfly',
    name: 'Celestial Butterfly',
    category: 'nature',
    imgUrl: '/stickers/celestial_butterfly.png',
    badge: 'Botanical Wing'
  },
  {
    id: 'monstera-leaf',
    name: 'Tropical Monstera',
    category: 'nature',
    imgUrl: '/stickers/monstera_leaf.png',
    badge: 'Lush Botanical'
  },
  {
    id: 'great-wave',
    name: 'Great Wave Kanagawa',
    category: 'nature',
    imgUrl: '/stickers/great_wave.png',
    badge: 'Woodblock Print'
  },
  {
    id: 'yin-yang-koi',
    name: 'Yin-Yang Twin Koi',
    category: 'nature',
    imgUrl: '/stickers/yin_yang_koi.png',
    badge: 'Japanese Wave'
  },
  {
    id: 'botanical-rose',
    name: 'Heritage Wild Rose',
    category: 'nature',
    imgUrl: '/stickers/botanical_rose.png',
    badge: 'Botanical Ink'
  },
  {
    id: 'vintage-sunburst',
    name: 'Golden Sunburst',
    category: 'nature',
    imgUrl: '/stickers/vintage_sunburst.png',
    badge: 'Eucalyptus Sun'
  },
  {
    id: 'desert-cactus',
    name: 'Saguaro Desert Sol',
    category: 'nature',
    imgUrl: '/stickers/desert_cactus.png',
    badge: 'Desert Emblem'
  },
  {
    id: 'wanderlust-compass',
    name: 'Wanderlust Compass',
    category: 'nature',
    imgUrl: '/stickers/wanderlust_compass.png',
    badge: 'Expedition'
  },
  {
    id: 'cherry-blossom',
    name: 'Sakura Cherry Blossom',
    category: 'nature',
    imgUrl: '/stickers/cherry_blossom.png',
    badge: 'Spring Bloom'
  },

  // 1. Streetwear Graphics & Iconic Pop Decals
  {
    id: 'porsche-911',
    name: 'Porsche 911 Legend',
    category: 'streetwear',
    imgUrl: '/stickers/porsche_911.png',
    badge: 'Vintage Auto'
  },
  {
    id: 'crimson-spider',
    name: 'Crimson Spider',
    category: 'streetwear',
    imgUrl: '/stickers/crimson_spider.png',
    badge: 'Hero Emblem'
  },
  {
    id: 'stay-weird',
    name: 'Stay Weird Groovy',
    category: 'streetwear',
    imgUrl: '/stickers/stay_weird.png',
    badge: 'Retro Psychedelic'
  },
  {
    id: 'halftone-cat',
    name: 'Halftone Grunge Cat',
    category: 'streetwear',
    imgUrl: '/stickers/halftone_cat.png',
    badge: 'Screenprint Dot'
  },
  {
    id: 'social-introvert',
    name: 'Social Introvert',
    category: 'streetwear',
    imgUrl: '/stickers/social_introvert.png',
    badge: 'Streetwear Graphic'
  },
  {
    id: 'chill-vibes',
    name: 'Chill Vibes Hoodie',
    category: 'streetwear',
    imgUrl: '/stickers/chill_vibes.png',
    badge: 'Graffiti Anime'
  },
  {
    id: 'turbo-gt',
    name: 'Turbo GT 1989',
    category: 'streetwear',
    imgUrl: '/stickers/turbo_gt_badge.png',
    badge: 'Racing Badge'
  },
  {
    id: 'feel-free',
    name: 'Feel Free Melt',
    category: 'streetwear',
    imgUrl: '/stickers/feel_free.png',
    badge: 'Liquid 70s'
  },
  {
    id: 'halftone-shiba',
    name: 'Shiba Gang Risograph',
    category: 'streetwear',
    imgUrl: '/stickers/halftone_shiba.png',
    badge: 'Halftone Print'
  },

  // 1. Robots & Cyber
  {
    id: 'mecha-bear',
    name: 'Mecha Bear',
    category: 'robots',
    imgUrl: '/stickers/mecha_bear.png',
    badge: '3D Vinyl'
  },
  {
    id: 'retro-robot',
    name: 'Vintage Robo',
    category: 'robots',
    imgUrl: '/stickers/retro_robot.png',
    badge: '3D Enamel'
  },
  {
    id: 'cyber-puppy',
    name: 'Robo Pup',
    category: 'robots',
    imgUrl: '/stickers/cyber_puppy.png',
    badge: 'Cyborg'
  },

  // 2. Animals & Kawaii Creatures
  {
    id: 'skater-dino',
    name: 'Skater Rex',
    category: 'animals',
    imgUrl: '/stickers/skater_dino.png',
    badge: 'Streetwear'
  },
  {
    id: 'cyber-cat',
    name: 'Mecha Neko',
    category: 'animals',
    imgUrl: '/stickers/cyber_cat.png',
    badge: 'Cyberpunk'
  },
  {
    id: 'vinyl-bunny',
    name: 'Magic Bunny',
    category: 'animals',
    imgUrl: '/stickers/vinyl_bunny.png',
    badge: 'Art Toy'
  },
  {
    id: 'boba-cup',
    name: 'Bear Boba Tea',
    category: 'animals',
    imgUrl: '/stickers/boba_cup.png',
    badge: 'Kawaii'
  },
  {
    id: 'cyber-shiba',
    name: 'Shiba Pilot',
    category: 'animals',
    imgUrl: '/stickers/cyber_shiba.png',
    badge: 'Cyberpunk'
  },
  {
    id: 'baby-dragon',
    name: 'Pyro Dragon',
    category: 'animals',
    imgUrl: '/stickers/baby_dragon.png',
    badge: 'Art Toy'
  },
  {
    id: 'samurai-cat',
    name: 'Samurai Neko',
    category: 'animals',
    imgUrl: '/stickers/samurai_cat.png',
    badge: 'Warrior'
  },
  {
    id: 'skater-bear',
    name: 'Skater Bear',
    category: 'animals',
    imgUrl: '/stickers/skater_bear.png',
    badge: 'Bear Squad'
  },

  // 3. Space & Sci-Fi
  {
    id: 'astro-ducky',
    name: 'Cosmo Ducky',
    category: 'space',
    imgUrl: '/stickers/astro_ducky.png',
    badge: '3D Vinyl'
  },
  {
    id: 'space-rocket',
    name: 'Galaxy Rocket',
    category: 'space',
    imgUrl: '/stickers/space_rocket.png',
    badge: 'Cosmic'
  },
  {
    id: 'ufo-alien',
    name: 'Saucer Alien',
    category: 'space',
    imgUrl: '/stickers/ufo_alien.png',
    badge: 'Sci-Fi'
  },
  {
    id: 'astro-spaceman',
    name: 'Space Cadet',
    category: 'space',
    imgUrl: '/stickers/astro_spaceman.png',
    badge: 'Cosmic'
  },
  {
    id: 'balloon-astronaut',
    name: 'Planet Balloonist',
    category: 'space',
    imgUrl: '/stickers/balloon_astronaut.png',
    badge: 'Art Toy'
  },

  // 4. Gaming & Retro Tech
  {
    id: 'arcade-machine',
    name: 'Arcade Cabinet',
    category: 'gaming',
    imgUrl: '/stickers/arcade_machine.png',
    badge: '8-Bit Retro'
  },
  {
    id: 'arcade-ghost',
    name: 'DJ Ghosty',
    category: 'gaming',
    imgUrl: '/stickers/arcade_ghost.png',
    badge: 'Retro Beats'
  },
  {
    id: 'golden-star',
    name: 'Power Star',
    category: 'gaming',
    imgUrl: '/stickers/golden_star.png',
    badge: 'Glossy Gold'
  },
  {
    id: 'magic-mushroom',
    name: 'Power Shroom',
    category: 'gaming',
    imgUrl: '/stickers/magic_mushroom.png',
    badge: 'Classic 1UP'
  },
  {
    id: 'golden-gamepad',
    name: 'Gold Controller',
    category: 'gaming',
    imgUrl: '/stickers/golden_gamepad.png',
    badge: 'Metallic'
  },
  {
    id: 'retro-gameboy',
    name: 'Cyber Boy',
    category: 'gaming',
    imgUrl: '/stickers/retro_gameboy.png',
    badge: 'Neon Retro'
  },
  {
    id: 'classic-gameboy',
    name: 'Pocket Arcade',
    category: 'gaming',
    imgUrl: '/stickers/classic_gameboy.png',
    badge: 'Retro 90s'
  },
  {
    id: 'mixtape-cassette',
    name: 'Retro Mixtape',
    category: 'gaming',
    imgUrl: '/stickers/mixtape_cassette.png',
    badge: '80s Synth'
  },
  {
    id: 'cosmic-potion',
    name: 'Galaxy Elixir',
    category: 'gaming',
    imgUrl: '/stickers/cosmic_potion.png',
    badge: 'Magic Potion'
  },
  {
    id: 'pixel-trophy',
    name: 'Gold Trophy',
    category: 'gaming',
    imgUrl: '/stickers/pixel_trophy.png',
    badge: 'Pixel Champ'
  },

  // 5. Streetwear & Pop Art
  {
    id: 'street-sneaker',
    name: 'Retro High-Top',
    category: 'street',
    imgUrl: '/stickers/street_sneaker.png',
    badge: 'Kicks'
  },
  {
    id: 'lightning-kicks',
    name: 'Bolt Sneaker',
    category: 'street',
    imgUrl: '/stickers/lightning_kicks.png',
    badge: 'Holographic'
  },
  {
    id: 'crystal-heart',
    name: 'Crystal Heart',
    category: 'street',
    imgUrl: '/stickers/crystal_heart.png',
    badge: 'Faceted Gem'
  },
  {
    id: 'street-boombox',
    name: 'Street Boombox',
    category: 'street',
    imgUrl: '/stickers/street_boombox.png',
    badge: '90s Beats'
  },
  {
    id: 'skater-skull',
    name: 'Wave Skull',
    category: 'street',
    imgUrl: '/stickers/skater_skull.png',
    badge: 'Skatepark'
  },
  {
    id: 'melting-smiley',
    name: 'Melting Smile',
    category: 'street',
    imgUrl: '/stickers/melting_smiley.png',
    badge: 'Neon Drip'
  },
  {
    id: 'vinyl-ninja',
    name: 'Shadow Ninja',
    category: 'street',
    imgUrl: '/stickers/vinyl_ninja.png',
    badge: 'Vinyl Toy'
  },
  {
    id: 'glossy-cherries',
    name: 'Twin Cherries',
    category: 'street',
    imgUrl: '/stickers/glossy_cherries.png',
    badge: 'Glossy Vinyl'
  },
  {
    id: 'rainbow-cloud',
    name: 'Pastel Cloud',
    category: 'street',
    imgUrl: '/stickers/rainbow_cloud.png',
    badge: 'Kawaii'
  },
  {
    id: 'neon-ramen',
    name: 'Ramen Bowl',
    category: 'street',
    imgUrl: '/stickers/neon_ramen.png',
    badge: 'Neon Tokyo'
  },
  {
    id: 'hologram-skull',
    name: 'DJ Cyber Skull',
    category: 'street',
    imgUrl: '/stickers/hologram_skull.png',
    badge: 'Audiophile'
  }
];

export interface ColorSwatch {
  name: string;
  hex: string;
  category: string;
}

export const COLOR_PALETTES: ColorSwatch[] = [
  { name: 'Pure White', hex: '#ffffff', category: 'Essential' },
  { name: 'Onyx Black', hex: '#16181d', category: 'Essential' },
  { name: 'Heather Grey', hex: '#94a3b8', category: 'Essential' },
  { name: 'Washed Slate', hex: '#475569', category: 'Essential' },
  { name: 'Cyber Cyan', hex: '#06b6d4', category: 'Vibrant' },
  { name: 'Electric Violet', hex: '#8b5cf6', category: 'Vibrant' },
  { name: 'Hyper Orange', hex: '#f97316', category: 'Vibrant' },
  { name: 'Acid Green', hex: '#84cc16', category: 'Vibrant' },
  { name: 'Hot Crimson', hex: '#ef4444', category: 'Vibrant' },
  { name: 'Pastel Mint', hex: '#a7f3d0', category: 'Pastel' },
  { name: 'Soft Peach', hex: '#fed7aa', category: 'Pastel' },
  { name: 'Candy Pink', hex: '#fbcfe8', category: 'Pastel' },
  { name: 'Baby Blue', hex: '#bae6fd', category: 'Pastel' },
  { name: 'Butter Yellow', hex: '#fef08a', category: 'Pastel' },
  { name: 'Warm Cream', hex: '#f5efe6', category: 'Earthy' },
  { name: 'Deep Olive', hex: '#3f6212', category: 'Earthy' },
  { name: 'Burnt Amber', hex: '#9a3412', category: 'Earthy' },
  { name: 'Midnight Navy', hex: '#1e3a8a', category: 'Earthy' }
];

export interface PresetGraphic {
  id: string;
  title: string;
  svg: string;
}

export const PRESET_GRAPHICS: PresetGraphic[] = [
  {
    id: 'graphic-smile',
    title: 'Melting Smile',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="44" fill="#facc15" stroke="#0f172a" stroke-width="4"/>
      <ellipse cx="36" cy="40" rx="5" ry="9" fill="#0f172a"/>
      <ellipse cx="64" cy="40" rx="5" ry="9" fill="#0f172a"/>
      <path d="M30 62 C38 78 62 78 70 62 C74 74 68 84 62 86 C56 88 52 74 48 84 C44 94 36 86 32 76 Z" fill="#0f172a"/>
    </svg>`
  },
  {
    id: 'graphic-flame',
    title: 'Retro Flame',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 8 C56 26 78 40 78 62 C78 78 65 92 50 92 C35 92 22 78 22 62 C22 46 36 34 40 22 C44 32 52 38 48 46 C54 36 50 20 50 8 Z" fill="#f97316" stroke="#ffffff" stroke-width="4"/>
      <path d="M50 36 C54 48 66 56 66 70 C66 80 58 88 50 88 C42 88 34 80 34 70 C34 60 42 52 46 44 Z" fill="#facc15"/>
    </svg>`
  },
  {
    id: 'graphic-heart',
    title: 'Pixel Heart',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 84 L20 54 C10 44 10 28 22 18 C34 8 46 14 50 24 C54 14 66 8 78 18 C90 28 90 44 80 54 Z" fill="#ef4444" stroke="#ffffff" stroke-width="5"/>
      <ellipse cx="34" cy="28" rx="6" ry="4" fill="#fca5a5" transform="rotate(-30 34 28)"/>
    </svg>`
  },
  {
    id: 'graphic-star',
    title: 'Neon Star',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="50,6 63,35 95,38 71,59 78,90 50,74 22,90 29,59 5,38 37,35" fill="#a855f7" stroke="#ffffff" stroke-width="5"/>
      <polygon points="50,18 58,38 78,40 62,54 66,74 50,64 34,74 38,54 22,40 42,38" fill="#c084fc"/>
    </svg>`
  }
];
