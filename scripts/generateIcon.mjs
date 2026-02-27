// scripts/generateIcon.mjs
// Script para generar el icon.png desde icon.svg
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const svgPath = join(__dirname, '..', 'assets', 'icon.svg');
const pngPath = join(__dirname, '..', 'assets', 'icon.png');
const adaptiveIconPath = join(__dirname, '..', 'assets', 'adaptive-icon.png');
const faviconPath = join(__dirname, '..', 'assets', 'favicon.png');
const splashPath = join(__dirname, '..', 'assets', 'splash.png');

async function generateIcons() {
  console.log('🎨 Generando íconos desde SVG...\n');
  
  const svgContent = readFileSync(svgPath);
  
  // Generar icon.png (1024x1024)
  console.log('📱 Generando icon.png (1024x1024)...');
  await sharp(svgContent)
    .resize(1024, 1024)
    .png({ quality: 100 })
    .toFile(pngPath);
  console.log('   ✅ icon.png generado');
  
  // Generar adaptive-icon.png (1024x1024) - mismo que icon
  console.log('📱 Generando adaptive-icon.png (1024x1024)...');
  await sharp(svgContent)
    .resize(1024, 1024)
    .png({ quality: 100 })
    .toFile(adaptiveIconPath);
  console.log('   ✅ adaptive-icon.png generado');
  
  // Generar favicon.png (64x64)
  console.log('🌐 Generando favicon.png (64x64)...');
  await sharp(svgContent)
    .resize(64, 64)
    .png({ quality: 100 })
    .toFile(faviconPath);
  console.log('   ✅ favicon.png generado');
  
  // Generar splash.png (1284x2778 - iPhone 14 Pro Max size)
  console.log('🖼️  Generando splash.png (1284x2778)...');
  
  // Crear splash con fondo guinda y el ícono centrado
  const iconForSplash = await sharp(svgContent)
    .resize(400, 400)
    .toBuffer();
  
  await sharp({
    create: {
      width: 1284,
      height: 2778,
      channels: 4,
      background: { r: 159, g: 34, b: 65, alpha: 1 } // #9F2241
    }
  })
  .composite([{
    input: iconForSplash,
    gravity: 'center'
  }])
  .png({ quality: 100 })
  .toFile(splashPath);
  console.log('   ✅ splash.png generado');
  
  console.log('\n🎉 ¡Todos los íconos generados exitosamente!');
  console.log('\nArchivos actualizados:');
  console.log('  - assets/icon.png');
  console.log('  - assets/adaptive-icon.png');
  console.log('  - assets/favicon.png');
  console.log('  - assets/splash.png');
}

generateIcons().catch(console.error);
