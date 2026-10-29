import sharp from 'sharp';
const m1 = await sharp('public/mockups/crew_front.png').metadata();
console.log('crew_front:', m1.width, m1.height, m1.channels);
const m2 = await sharp('public/mockups/crew_back.png').metadata();
console.log('crew_back:', m2.width, m2.height, m2.channels);
