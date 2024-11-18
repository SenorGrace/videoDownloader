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

// Helper function to sanitize the TikTok URL
const sanitizeTikTokUrl = (url) => {
    try {
        const urlObj = new URL(url);

        // Remove unnecessary query parameters
        urlObj.searchParams.delete('sender_device');
        urlObj.searchParams.delete('is_from_webapp');
        urlObj.searchParams.delete('utm_source');
        urlObj.searchParams.delete('utm_medium');
        urlObj.searchParams.delete('utm_campaign');

        console.log(`Sanitized URL: ${urlObj.href}`);
        return urlObj.href;
    } catch (error) {
        console.error('Error sanitizing URL:', error);
        throw new Error('Invalid TikTok URL');
    }
};

const getVideoUrlFromTikTok = async (tiktokUrl) => {
    const profilePath = 'C:\\Users\\user\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 4'; // Adjust as needed

    try {
        const context = await playwright.chromium.launchPersistentContext(profilePath, {
            headless: true, // For observation, set to true in production
            args: [
                '--disable-blink-features=AutomationControlled', // Bypass detection
                '--no-sandbox',
                '--disable-infobars',
                '--disable-extensions',
                '--window-size=1280,800', // Set a realistic window size
            ],
        });

        const page = await context.newPage();

        try {
            // Clean the URL by removing unnecessary query parameters
            const vidUrl = sanitizeTikTokUrl(tiktokUrl);
            console.log(`Navigating to: ${vidUrl}`);
          
          // Go to the sanitized URL
          const postVideo = await page.goto(vidUrl, { waitUntil: 'networkidle0', timeout: 150000 });

            page.on('popup', async (popup) => {
                await popup.close(); // Close popups immediately if unwanted
            });

            // Random wait to simulate human interaction
            await page.waitForTimeout(Math.random() * 2000 + 1000);

            console.log('Navigated to TikTok post...');
            await bypassDetection(page); // Handle detection bypass

            console.log('Searching for video...');

            const { videoUrl, title } = await findTiktokUrlAndTitle(page); // Use your logic to extract the video

            if (!videoUrl) {
                throw new Error('No video found on the page.');
            }

            console.log(`Found video URL is: ${videoUrl}, But will the sanitizedUrl for now `);
            return { videoUrl, title };
        } catch (error) {
            console.error('Error during video extraction:', error);
            throw error;
        } finally {
            await page.close();
            console.log('Page closed successfully.');
        }
    } catch (err) {
        console.error('Browser context initialization error:', err);
        throw err;
    }
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

const findTiktokUrlAndTitle = async (page) => {
    return await page.evaluate(() => {
        const searchForVideo = (element) => {
            const video = element.querySelector('video');
            if (video) {
                // Check if multiple <source> tags exist and choose the first one with a valid src
                const sources = Array.from(video.querySelectorAll('source'));
                for (const source of sources) {
                    if (source.src && !source.src.includes('placeholder')) {
                        console.log('source.src gotten (video gotten');
                        return source.src;
                    }
                }

                // If no valid <source> found, fallback to the <video> tag's src
                if (video.src && !video.src.includes('placeholder')) {
                    console.log('using video.src probably');
                    return video.src;
                }
            }

            // Recursively search children if no video is found at this level
            for (const child of element.children) {
                const result = searchForVideo(child);
                console.log('using for load in findtiktok..');
                if (result) return result;
            }
            return null; // No video found
        };

        const videoUrl = searchForVideo(document.body); // Start searching from the body

        // Extract title from meta tags or use a fallback
        const title = document.querySelector('meta[property="og:title"]')?.content ||
                      document.querySelector('title')?.innerText || 
                      'untitled-tiktok-video';

        return { videoUrl, title }; // Return both video URL and title
    });
};

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

const downloadtiktokVideo = async (videoUrl, title) => {
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


module.exports = {
    getVideoUrlFromTikTok,
    downloadtiktokVideo,
};