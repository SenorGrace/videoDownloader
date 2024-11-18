require('dotenv').config(); // Load .env variables
const ytdl = require('ytdl-core');
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
// const proxyUrl = process.env.PROXY_URL;

// Set FFmpeg binary path
ffmpeg.setFfmpegPath(ffmpegPath);

const filterCookiesByDomain = (cookies, targetDomain) => {
    return cookies
        .filter(cookie => cookie.domain.endsWith(targetDomain)) // Ensure exact match
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');
};

const getVideoUrlFromYoutube = async (youtubeUrl) => {
    const customUserAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

    let browser, context, page;
    try {
        // Launch the browser
        browser = await playwright.chromium.launch({
            headless: true,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-infobars',
                '--disable-extensions',
                '--window-size=1280,800',
            ],
        });

        // Create an incognito browser context
        context = await browser.newContext({
            userAgent: customUserAgent,
        });

        // Create a new page in the incognito context
        page = await context.newPage();

        // Use addInitScript to inject anti-detection code
        await page.addInitScript(() => {
            // Override navigator.webdriver to false
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });

            // Mock plugins and languages
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3] // Simulate browser plugins
            });

            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en']
            });
        });

        // Navigate to the YouTube URL
        await page.goto(youtubeUrl, { waitUntil: 'networkidle' });

        // Extract the title or video URL (custom function)
        const title = await findYoutubeUrlAndTitle(page);
        console.log(`Extracted Title: ${title}`);

        // Get the cookies from the incognito context
        const cookies = await context.cookies();
        console.log('Extracted cookies:', cookies); // Debugging cookies

        // Filter cookies specific to YouTube
        const youtubeCookies = cookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            httpOnly: cookie.httpOnly,
            secure: cookie.secure,
            sameSite: cookie.sameSite,
            expirationDate: cookie.expires ? new Date(cookie.expires * 1000) : undefined,
        }));

        const formattedCookies = filterCookiesByDomain(youtubeCookies, 'youtube.com');
        console.log('Formatted YouTube cookies:', formattedCookies);

        return { title, cookies: formattedCookies, userAgent: customUserAgent };
    } catch (error) {
        console.error('Error fetching video URL:', error);
    } finally {
        // Close the browser if it was launched
        if (browser) {
            await browser.close();
        }
    }
};


//a Separate function to handle the detection bypass
const bypassYoutubeDetection = async (page) => {
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

const findYoutubeUrlAndTitle = async (page) => {
    return await page.evaluate(() => {
        const searchForVideo = (element) => {
            const video = element.querySelector('video');
            if (video && video.src && !video.src.includes('placeholder')) {
                console.log('using video element');
                return video.src;
            } 

            const img = element.querySelector('img[src]');
            if (img && !img.src.includes('placeholder')) {
                console.log('using ordinary image element');
                return img.src;
            }

            const bgImage = getComputedStyle(element).backgroundImage;
            if (bgImage && bgImage.includes('url')) {
                const match = bgImage.match(/url\("(.*)"\)/);
                if (match && !match[1].includes('placeholder')) {
                    console.log('using bg image');
                    return match[1];
                } 
            }

            // Recursively search children
            for (const child of element.children) {
                const result = searchForVideo(child);
                if (result) return result;
            }
            return null; // No video found
        };

        const videoUrl = searchForVideo(document.body); // Start from the body

        // Extract title or fallback to "untitled"
        const title = document.querySelector('meta[property="og:title"]')?.content ||
                      document.querySelector('title')?.innerText || 
                      'untitled-video';

       // return { videoUrl, title }; // Return both video URL and title
       return title // I decided just to return the title, note : that the findYoutubeUrlAndTitle is being called in the getvideourl.. 
    });
};

// Sanitize title to remove invalid file system characters
const sanitizedTitle = (title) => {
    return title
        .replace(/[<>:"/\\|?*\n\r]+/g, '-') // Replace invalid characters with '-'
        .replace(/\s+/g, ' ')               // Replace multiple spaces/newlines with a single space
        .trim();                            // Remove leading/trailing spaces
};

// Function to download and merge video and audio streams

/**
 * Downloads the best video and audio separately from YouTube and merges them using ffmpeg.
 */
const downloadYoutubeVideo = async (videoUrl, title, cookies, userAgent) => {
    console.log(`Using ${videoUrl} in the downloadYoutubeVideo`);
    console.log(`Using ${userAgent} in the downloadYoutubeVideo`);

    const sanitizeTitle = sanitizedTitle(title); // Sanitize the title for safe file naming

    try {
        // Fetch video info from YouTube
        const videoInfo = await ytdl.getInfo(videoUrl);
        console.log('Video info retrieved successfully.');

        // Select the best video-only format
        const videoFormat = videoInfo.formats
            .filter(f => f.hasVideo && !f.hasAudio)
            .sort((a, b) => b.bitrate - a.bitrate)[0];

        // Select the best audio-only format
        const audioFormat = videoInfo.formats
            .filter(f => !f.hasVideo && f.hasAudio)
            .sort((a, b) => b.bitrate - a.bitrate)[0];

        if (!videoFormat || !audioFormat) {
            throw new Error('No suitable video or audio format found.');
        }

        console.log(`Selected video format: ${videoFormat.itag} with bitrate ${videoFormat.bitrate}`);
        console.log(`Selected audio format: ${audioFormat.itag} with bitrate ${audioFormat.bitrate}`);

        // Set paths for the downloaded video and audio
        const videoPath = path.resolve(__dirname, '../../Downloads', `${sanitizeTitle}.video`);
        const audioPath = path.resolve(__dirname, '../../Downloads', `${sanitizeTitle}.audio`);
        const outputPath = path.resolve(__dirname, '../../Downloads', `${sanitizeTitle}.mp4`);

        // Download video-only stream
        await downloadStream(videoUrl, videoFormat.itag, videoPath, cookies, userAgent);

        // Download audio-only stream
        await downloadStream(videoUrl, audioFormat.itag, audioPath, cookies, userAgent);

        console.log('Finished processing the youtube video and now processing the audio function below');

        // Merge the video and audio using ffmpeg
        await mergeVideoAndAudio(videoPath, audioPath, outputPath);
        console.log('processing the youtube audio now');

        console.log(`Download and merge completed: ${outputPath}`);
        return { videoPath: outputPath };
    } catch (error) {
        console.error('Error processing YouTube download:', error);
        throw error; // Propagate error for higher-level handling
    }
};

/**
 * Helper function to download a stream from YouTube.
 */
const downloadStream = (videoUrl, itag, outputPath, cookies = [], userAgent, proxyUrl) => {
    return new Promise((resolve, reject) => {
        const headers = {
            'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Referer': videoUrl,
            'Origin': 'https://www.youtube.com',
        };

        const firstCookieEncounter = cookies;
        console.log('the first cookie gotten is,',firstCookieEncounter);

          // Ensure cookies is always an array
          //cookies = Array.isArray(cookies) ? cookies : [];

        // Only add cookies if they exist
       // Check if cookies is a string and add directly if so
        if (typeof cookies === 'string' && cookies.length > 0) {
        headers['Cookie'] = cookies;
        } else if (Array.isArray(cookies) && cookies.length > 0) {
        headers['Cookie'] = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
        }

        console.log('cookies were returned and is :',cookies);

        // Create a proxy agent if a proxy URL is provided
        const proxyAgent = proxyUrl ? new HttpProxyAgent(proxyUrl) : null;

        const options = {
            quality: itag,
            requestOptions: {
                headers,
                timeout: 180000,
                agent: proxyAgent, // Add the proxy agent here
            },
        };

        console.log('Request Headers:', headers); // Log the request headers

        const writer = fs.createWriteStream(outputPath);
        const stream = ytdl(videoUrl, options);

        // Log response headers from the stream request
        stream.on('response', (res) => {
            console.log('Response Headers:', res.headers); // Log response headers
        });

        stream.pipe(writer);

        stream.on('progress', (chunkLength, downloaded, total) => {
            console.log(`Downloading ${outputPath}: ${((downloaded / total) * 100).toFixed(2)}%`);
        });

        writer.on('finish', resolve);
        writer.on('error', reject);
        stream.on('error', reject);
    });
};


/**
 * Helper function to merge video and audio using ffmpeg.
 */
const mergeVideoAndAudio = (videoPath, audioPath, outputPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(videoPath)
            .input(audioPath)
            .outputOptions('-c:v copy', '-c:a aac') // Copy video, convert audio to AAC
            .on('end', () => {
                console.log('Merging completed successfully.');
                fs.unlinkSync(videoPath); // Clean up temporary files
                fs.unlinkSync(audioPath);
                resolve();
            })
            .on('error', (err) => reject(err))
            .save(outputPath);
    });
};



module.exports = {
    getVideoUrlFromYoutube,
    bypassYoutubeDetection,
    downloadYoutubeVideo,
};


// give me all potential scenarios where my stream gotten from ytdl could lead to potential errors even though the other code blocks after the error still gets executed and despite all, the stream would be piped which is of zero bytes size, my current syntax of using/getting the stream is : 
