const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { addExtra } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// Add stealth plugin to Playwright
const playwright = addExtra(require('playwright'));
playwright.use(StealthPlugin())
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static'); // Ensure ffmpeg-static is installed
// Sanitize title to remove invalid file system characters


const sanitizedTitle = (title, maxLength = 15) => {
    const sanitized = title
        .replace(/[<>:"/\\|?*\n\r]+/g, '-') // Replace invalid characters with '-'
        .replace(/\s+/g, ' ')               // Replace multiple spaces/newlines with a single space
        .trim();                            // Remove leading/trailing spaces

    // Truncate the title if it exceeds maxLength, ensuring not to break words
    if (sanitized.length > maxLength) {
        return sanitized.slice(0, maxLength).trim() + '...'; // Add ellipsis if truncated
    }
    
    return sanitized; // Return the sanitized title
};


const getVideoUrlFromInstagram = async (instaUrl) => {
    const profilePath = 'C:\\Users\\user\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 4'; // Adjust path

    try {
        const context = await playwright.chromium.launch(profilePath, {
            headless: false, // Disable headless mode for observation
            // slowMo: 50, // Optional slow motion
            args: [
                '--disable-blink-features=AutomationControlled', // Bypass detection
                '--no-sandbox',
                '--disable-infobars',
                '--disable-extensions',
                '--window-size=1280,800', // Set a realistic window size
            ],
        });

        const page = await context.newPage(); // Create the page from the persistent context

        try {
            console.log(`Navigating to: ${instaUrl}`);
            await page.goto(instaUrl, { waitUntil: 'networkidle0', timeout: 150000 });

            page.on('popup', async (popup) => {
                await popup.close(); // Close popups immediately if unwanted
            });

            // Random wait to simulate human interaction
            await page.waitForTimeout(Math.random() * 2000 + 1000); // Delay of 1-3 seconds

            console.log('Navigated to Instagram post...');
            await bypassDetection(page); // Handle detection bypass

            console.log('Searching for video...');
            const { videoUrl, title } = await findIgUrlAndTitle(page); // Use your function to find the video URL

            if (!videoUrl) {
                throw new Error('No video found on the page.');
            }

            console.log(`Found video URL: ${videoUrl}`);
            return { videoUrl, title }; // Return the found video URL
        } catch (error) {
            console.error('Error during video extraction:', error);
            throw error; // Rethrow the error to handle it in the outer try-catch
        } finally {
            await page.close();
            console.log('Page closed successfully.');
        }
    } catch (err) {
        console.error('Browser context initialization error:', err);
        throw err; // Ensure the error propagates to the calling function
    }
};

const downloadIgVideo = async (videoUrl, title) => {
    const sanitizeTitle = sanitizedTitle(title); // Correctly call the function with the title
    console.log('The sanitized title is:',sanitizeTitle);
   
   
    // Define the path for the downloaded video
   const outputDir = path.resolve(__dirname, '../../Downloads'); // Adjust to your structure
   const videoPath = path.join(outputDir, `${sanitizeTitle}.mp4`);

   // Ensure the output directory exists
   if (!fs.existsSync(outputDir)) {
       fs.mkdirSync(outputDir, { recursive: true }); // Create the Downloads directory if it doesn't exist
   }

   console.log('Downloading video...');

    const response = await axios({
        url: videoUrl,
        method: 'GET',
        responseType: 'stream',
    });

    const writer = fs.createWriteStream(videoPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(videoPath));
        writer.on('error', reject);
    });
};

//a Separate function to handle the detection bypass
const bypassDetection = async (page) => {
    await page.evaluate(() => {
        if (!navigator.webdriver) {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        }
        if (!navigator.languages) {
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        }
        // Handle pop-ups
        document.querySelectorAll('button').forEach((btn) => {
            if (/Not Now|Accept/i.test(btn.innerText)) {
                btn.click();
            }
        });
    });
};

// Revised findIgUrlAndTitle function with better error handling
const findIgUrlAndTitle = async (page) => {
    return await page.evaluate(() => {
        const searchForVideo = (element) => {
            const video = element.querySelector('video');
            if (video && video.src && !video.src.includes('placeholder')) {
                console.log('Using video element');
                return video.src; // Return video source if valid
            }

            // Recursively search through child elements for video
            for (const child of element.children) {
                const result = searchForVideo(child);
                if (result) return result; // If a valid video is found, return it
            }
            return null; // No valid video found
        };

        const searchForDiv = (element) => {
            const div = element.querySelector('div'); // Adjust the selector as needed
            if (div && div.innerHTML) {
                console.log('Using div element');
                // Extract a relevant URL or text content from the div if applicable
                // This is an example; modify as needed based on the expected structure
                const urlMatch = div.innerHTML.match(/(http[^\s]+)/); // Match first URL in the innerHTML
                return urlMatch ? urlMatch[0] : null; // Return the URL if found
            }

            // Recursively search through child elements for div
            for (const child of element.children) {
                const result = searchForDiv(child);
                if (result) return result; // If a valid URL is found in a div, return it
            }
            return null; // No valid URL found in divs
        };

        const videoUrl = searchForVideo(document.body); // Start searching for videos
        const validVideoUrl = videoUrl || searchForDiv(document.body); // Fallback to div if no video found

        // Extract title or fallback to "untitled"
        const title = document.querySelector('meta[property="og:title"]')?.content ||
                      document.querySelector('title')?.innerText || 
                      'untitled-video';

        // If no valid video or div URL is found, return an error
        if (!validVideoUrl) {
            throw new Error('No valid video URL found'); // This will trigger the error handling in the calling function
        }

        return { videoUrl: validVideoUrl, title }; // Return the valid video URL and title
    });
};

module.exports = {
    getVideoUrlFromInstagram,
    downloadIgVideo,
};