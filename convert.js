import { Jimp } from 'jimp';

async function convertLogo() {
  try {
    const image = await Jimp.read('public/logo.jpeg');
    image.resize({ w: 192, h: 192 });
    await image.write('public/logo-192.png');
    
    const image2 = await Jimp.read('public/logo.jpeg');
    image2.resize({ w: 512, h: 512 });
    await image2.write('public/logo-512.png');
    console.log('Converted successfully');
  } catch (error) {
    console.error('Error converting:', error);
  }
}

convertLogo();
