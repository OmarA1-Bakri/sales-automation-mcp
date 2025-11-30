const { Jimp } = require('jimp');
const path = require('path');

const images = [
    'rtgs_logo_light.png',
    'rtgs_hero_light.png'
];

async function processImages() {
    for (const imgName of images) {
        try {
            const imgPath = path.join(__dirname, 'public', imgName);
            console.log(`Processing ${imgPath}...`);

            const image = await Jimp.read(imgPath);

            // Get the color of the top-left pixel to determine the background color
            const bgColor = image.getPixelColor(0, 0);
            console.log(`Background color detected: ${bgColor}`);

            // Convert to RGBA (newer Jimp versions)
            const r = (bgColor >> 24) & 255;
            const g = (bgColor >> 16) & 255;
            const b = (bgColor >> 8) & 255;
            const a = bgColor & 255;

            console.log(`Background RGBA: (${r}, ${g}, ${b}, ${a})`);

            // Scan all pixels and make matching background transparent
            image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
                const pixelR = this.bitmap.data[idx + 0];
                const pixelG = this.bitmap.data[idx + 1];
                const pixelB = this.bitmap.data[idx + 2];

                // Tolerance for color matching
                const tolerance = 30;

                if (
                    Math.abs(pixelR - r) <= tolerance &&
                    Math.abs(pixelG - g) <= tolerance &&
                    Math.abs(pixelB - b) <= tolerance
                ) {
                    this.bitmap.data[idx + 3] = 0; // Set alpha to 0
                }
            });

            await image.write(imgPath);
            console.log(`Saved transparent version of ${imgName}`);
        } catch (error) {
            console.error(`Error processing ${imgName}:`, error.message);
        }
    }
}

processImages();
