require('dotenv').config();
const express = require('express');
const router = express.Router();
const { PlaywrightCrawler } = require('crawlee'); // or 'apify'
const { addExtra } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// Add stealth plugin to Playwright
const playwright = addExtra(require('playwright'));
const stealth = StealthPlugin();
stealth.enabledEvasions.delete('iframe.contentWindow'); // Disable specific evasions if not needed
stealth.enabledEvasions.add('navigator.plugins'); // Add more evasions if required
playwright.use(stealth);
process.env.YTDL_NO_UPDATE = 'true';
const path = require('path');
const fs = require('fs');
const ytdl = require('ytdl-core');
const https = require('https');
const axios = require('axios');
const axiosRetry = require('axios-retry').default; // Adjusted import
const { IgApiClient } = require('instagram-private-api'); // Importing instagram-private-api
const rateLimit = require('express-rate-limit');
const puppeteer = require('puppeteer');
const { CookieJar, Cookie } = require('tough-cookie');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static'); // Use ffmpeg-static
const mime = require('mime-types'); // For dynamic MIME type determination
//const { runApifyActor } = require('../apifyDownloader');  // Imported the Apify actor function
// const { 
//     getVideoUrlFromYoutube, 
//     downloadYoutubeVideo 
// } =require('../../public/js/youtube');  // Adjust the path if necessary

const { 
    getVideoUrlFromInstagram,
    downloadIgVideo,
} =require('../../public/js/instagram');  // Adjust the path if necessary

const { 
    getVideoUrlFromTikTok,
    downloadtiktokVideo,
} =require('../../public/js/tiktok');  // Adjust the path if necessary
const { chromium } = require('playwright'); // Ensure Playwright is installed

// Path to store the YouTube cookies
const cookiesFilePath = '/etc/secrets/youtube_cookie.txt';
// const cookiesFilePath = '../youtube_cookie.txt';
// const screenShot = path.resolve(__dirname, 'screenshots');


const { exec } = require('child_process');

// Set ffmpeg-static path for fluent-ffmpeg
ffmpeg.setFfmpegPath(ffmpegStatic);
const ig = new IgApiClient(); // Initialize Instagram client

// Home route
router.get('/', (req, res) => {
    res.render('index');
});

// Route for YouTube page
router.get('/youtube', (req, res) => {
    res.render('youtube'); // Assuming you have a 'youtube.ejs' template
});

// Route for Instagram page
router.get('/instagram', (req, res) => {
    res.render('index'); // on the request of the instagram route /instagram, the index page, designed with instagram page pattern is displayed 
});

// Route for Twitter page
router.get('/twitter', (req, res) => {
    res.render('twitter'); // Assuming you have a 'twitter.ejs' template
});

// Route for Tiktok page
router.get('/tiktok', (req, res) => {
    res.render('tiktok'); // Assuming you have an 'instagram.ejs' template
});

router.get('/learn-more', (req, res) => {
    res.render('learn-more'); // Assuming you have an 'learn more.ejs' template
});

router.get('/about', (req, res) => {
    res.render('about'); // Assuming you have an 'about.ejs' template
});

// Playwright function to log in and save cookies

// async function loginAndSaveCookies() {
//     const browser = await playwright.chromium.launch({
//                  headless: true,
//                  args: [
//                      '--no-sandbox',
//                      '--disable-setuid-sandbox',
//                      '--disable-blink-features=AutomationControlled',
//                      '--disable-extensions',
//                      '--start-maximized',
//                      '--disable-dev-shm-usage',
//                  ],
//              });
            
//              const context = await browser.newContext();
//              const page = await context.newPage();

//              await page.goto('https://www.youtube.com', { waitUntil: 'networkidle' });

//              const cookies = await context.cookies();
//                             //   console.log("Cookies extracted from YouTube:", cookies);
//                               saveCookiesToFile(cookies);
//                               await browser.close();
        
// }

// function saveCookiesToFile(cookies) {
//     const netscapeFormat = cookies
//         .filter(cookie => cookie.expires && cookie.expires > Date.now()) // Remove invalid or expired cookies
//         .map(cookie => {
//             const expires = Math.floor(cookie.expires || 0); // Ensure valid integer expiration
//             return `${cookie.domain}\tTRUE\t${cookie.path}\t${cookie.secure}\t${expires}\t${cookie.name}\t${cookie.value}`;
//         })
//         .join('\n');
    
//     fs.writeFileSync(cookiesFilePath, `# Netscape HTTP Cookie File\n${netscapeFormat}`);
//     console.log("Updated cookies saved to:", cookiesFilePath);
// }

// function areCookiesValid() {
//     if (!fs.existsSync(cookiesFilePath)) {
//         console.error("Cookies file not found.");
//         return false;
//     }

//     try {
//         const cookiesData = fs.readFileSync(cookiesFilePath, 'utf-8').trim();

//         // console.log('at the function areCookiesValid(), const cookiesData is', cookiesData);

//         if (!cookiesData) {
//             console.error("Cookies file is empty.");
//             return false;
//         }

//         if (cookiesData.startsWith("# Netscape")) {
//             // Handle Netscape format
//             const jar = new CookieJar();
//             console.log('at the function areCookiesValid(), const jar is', jar);
//             cookiesData.split('\n').forEach(line => {
//                 if (line && !line.startsWith('#')) {
//                     try {
//                         const cookie = Cookie.parse(line);
//                         if (cookie) jar.setCookieSync(cookie, 'https://www.youtube.com');
//                     } catch (e) {
//                         console.warn(`Error parsing cookie line: ${line}`, e.message);
//                     }
//                 }
//             });

//             const cookies = jar.getCookiesSync('https://www.youtube.com');
//             // console.log('at the function areCookiesValid(), const cookies is', cookies);
//             return cookies.some(cookie => cookie.key === 'SID' && cookie.expires && cookie.expires > new Date());
//         } else {
//             // Handle JSON format
//             let parsedData;
//             console.log('at the function areCookiesValid(), let parsedData is', parsedData);
//             try {
//                 parsedData = JSON.parse(cookiesData);
//             } catch (error) {
//                 console.error("Error parsing cookies JSON:", error.message);
//                 return false;
//             }

//             const jar = CookieJar.deserializeSync(parsedData);
//             console.log('at the function areCookiesValid(), new declaration of const jar is', jar);
//             const cookies = jar.getCookiesSync('https://www.youtube.com');
//             // console.log('at the function areCookiesValid(), new declaration of const cookies is', cookies);
//             return cookies.some(cookie => cookie.key === 'SID' && cookie.expires && cookie.expires > new Date());
//         }
//     } catch (error) {
//         console.error("Error reading cookies file:", error);
//         return false;
//     }
// }



router.post('/playYoutubeVideo', async (req, res) => {
    const videoUrl = req.body.videoUrl;

    if (!videoUrl) {
        return res.status(400).send('Please provide a valid video URL.');
    }

    fs.access(cookiesFilePath, fs.constants.F_OK, (err) => {
        if (err) {
          console.error(`File not found: ${cookiesFilePath}`);
        } else {
          console.log(`File exists: ${cookiesFilePath}`);
        }
      });

      fs.readFile(cookiesFilePath, 'utf8', (err, data) => {
        if (err) {
          console.error(`Error reading the file: ${err.message}`);
        } else {
          console.log(`Cookies file content: ${data.substring(0, 100)}...`); // Display first 100 characters
        }
      });
      

    try {
        const getUrlCommand = `yt-dlp --cookies "${cookiesFilePath}" --no-cookie-file -f "best[ext=mp4]" --get-url "${videoUrl}"`;
        // const getUrlCommand = `yt-dlp -f "best[ext=mp4]" --get-url "${videoUrl}"`;

        console.log('at /playYoutubeVideo, const getUrlCommand is', getUrlCommand);

        exec(getUrlCommand, (error, stdout, stderr) => {
            if (stderr) {
                console.error('Error retrieving video URL at /playvideo because of:', stderr);
                return res.status(500).send('Failed to retrieve video URL, because of',error);
            }

            if (stderr) {
                console.log('yt-dlp stderr from /playvideo is:', stderr);
            }

            if (error) {
                console.log(`error from /playvideo is: ${error.message}`);
            }

            const directVideoUrl = stdout.trim(); // Get the direct URL
            res.json({ directVideoUrl }); // Send the URL to the client
        });
    } catch (error) {
        console.error("Unexpected error:", error);
        res.status(500).send("An error occurred while processing your request.");
    }
});

router.post('/lowest-youtubequality', async (req, res) => {
    console.log('Received request to download youtube video'); 
    const youtubeUrl  = req.body.youtubeUrl;

    if (!youtubeUrl) {
        return res.status(400).send('Please provide a valid youtube video URL.');
    }

    try {
        // Define the output directory for the video
        const outputDir = path.join(__dirname, '../..', 'Downloads');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Step 1: Extract video title using yt-dlp
        const getTitleCommand = `yt-dlp --get-title "${youtubeUrl}"`;
        exec(getTitleCommand, (titleError, titleStdout, titleStderr) => {
            if (titleError) {
                console.error('Error retrieving youtube video title:', titleError);
                return res.status(500).send('Failed to retrieve video title.');
            }
            if (titleStderr) {
                console.log('yt-dlp title stderr:', titleStderr);
            }

            const videoTitle = titleStdout.trim().replace(/[/\\?%*:|"<>]/g, '-'); // Sanitize the title for file system compatibility
            const outputPath = path.join(outputDir, `${videoTitle}.mp4`);

            // Step 2: Download the video using the extracted title
            // const downloadCommand = `yt-dlp -f "bestvideo[height<=480]+bestaudio[ext=m4a]/best[height<=480]" --merge-output-format mp4 -o "${outputPath}" "${youtubeUrl}"`;

            const downloadCommand = `yt-dlp -f "worstvideo[ext=mp4]+worstaudio[ext=m4a]/mp4" --merge-output-format mp4 -o "${outputPath}" "${youtubeUrl}"`;

            // const downloadCommand = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4" --merge-output-format mp4 -o "${outputPath}" "${youtubeUrl}"`;
            console.log('Executing yt-dlp command:', downloadCommand);

            exec(downloadCommand, (downloadError, downloadStdout, downloadStderr) => {
                if (downloadError) {
                    console.error('Error downloading video:', downloadError);
                    return res.status(500).send('Failed to download the TikTok video.');
                }

                console.log('yt-dlp download output:', downloadStdout);
                if (downloadStderr) {
                    console.log('yt-dlp download stderr:', downloadStderr);
                }

                // Send the file to the client
                res.download(outputPath, `${videoTitle}.mp4`, (err) => {
                    if (err) {
                        console.error('Error sending the file to client:', err);
                    } else {
                        console.log('youtube video File sent successfully');
                        // Delete the file after sending
                        fs.unlink(outputPath, (unlinkErr) => {
                            if (unlinkErr) {
                                console.error('Error deleting the file:', unlinkErr);
                            } else {
                                console.log('Downloaded file deleted from server');
                            }
                        });
                    }
                });
            });
        });
    } catch (error) {
        console.error('Error processing youtube download:', error);
        res.status(500).send('Failed to download the youtube video.');
    }
});

router.post('/medium-youtubequality', async (req, res) => {
    console.log('Received request to download youtube video'); 
    const youtubeUrl  = req.body.youtubeUrl;

    if (!youtubeUrl) {
        return res.status(400).send('Please provide a valid youtube video URL.');
    }

    try {
        // Define the output directory for the video
        const outputDir = path.join(__dirname, '../..', 'Downloads');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Step 1: Extract video title using yt-dlp
        const getTitleCommand = `yt-dlp --get-title "${youtubeUrl}"`;
        exec(getTitleCommand, (titleError, titleStdout, titleStderr) => {
            if (titleError) {
                console.error('Error retrieving youtube video title:', titleError);
                return res.status(500).send('Failed to retrieve video title.');
            }
            if (titleStderr) {
                console.log('yt-dlp title stderr:', titleStderr);
            }

            const videoTitle = titleStdout.trim().replace(/[/\\?%*:|"<>]/g, '-'); // Sanitize the title for file system compatibility
            const outputPath = path.join(outputDir, `${videoTitle}.mp4`);

            // Step 2: Download the video using the extracted title
            const downloadCommand = `yt-dlp -f "bestvideo[height<=480]+bestaudio[ext=m4a]/best[height<=480]" --merge-output-format mp4 -o "${outputPath}" "${youtubeUrl}"`;

            // const downloadCommand = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4" --merge-output-format mp4 -o "${outputPath}" "${youtubeUrl}"`;
            console.log('Executing yt-dlp command:', downloadCommand);

            exec(downloadCommand, (downloadError, downloadStdout, downloadStderr) => {
                if (downloadError) {
                    console.error('Error downloading video:', downloadError);
                    return res.status(500).send('Failed to download the TikTok video.');
                }

                console.log('yt-dlp download output:', downloadStdout);
                if (downloadStderr) {
                    console.log('yt-dlp download stderr:', downloadStderr);
                }

                // Send the file to the client
                res.download(outputPath, `${videoTitle}.mp4`, (err) => {
                    if (err) {
                        console.error('Error sending the file to client:', err);
                    } else {
                        console.log('youtube video File sent successfully');
                        // Delete the file after sending
                        fs.unlink(outputPath, (unlinkErr) => {
                            if (unlinkErr) {
                                console.error('Error deleting the file:', unlinkErr);
                            } else {
                                console.log('Downloaded file deleted from server');
                            }
                        });
                    }
                });
            });
        });
    } catch (error) {
        console.error('Error processing youtube download:', error);
        res.status(500).send('Failed to download the youtube video.');
    }
});

router.post('/high-youtubequality', async (req, res) => {
    console.log('Received request to download YouTube video'); 
    const youtubeUrl = req.body.youtubeUrl;
    console.log("The YouTube URL received at router.post('/high-youtubequality') is:", youtubeUrl);

    if (!youtubeUrl) {
        return res.status(400).send('Please provide a valid YouTube video URL.');
    }

    const username = process.env.YOUTUBE_USERNAME;
    const password = process.env.YOUTUBE_PASSWORD;

    if (!username || !password) {
        console.error('YouTube credentials are not set in environment variables.');
        return res.status(500).send('YouTube credentials are missing. Please configure them securely.');
    }

    try {
        // Define the output directory for the video
        const outputDir = path.join(__dirname, '../..', 'Downloads');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Step 1: Extract video title using yt-dlp with authentication
        const getTitleCommand = `yt-dlp --username "${username}" --password "${password}" --get-title "${youtubeUrl}"`;
        exec(getTitleCommand, (titleError, titleStdout, titleStderr) => {
            if (titleError) {
                console.error('Error retrieving YouTube video title:', titleError);
                return res.status(500).send('Failed to retrieve video title.');
            }
            if (titleStderr.includes('Sign in')) {
                console.error('Authentication or CAPTCHA required:', titleStderr);
                return res.status(500).send('Authentication or CAPTCHA required. Check logs for details.');
            }
            if (titleStderr) {
                console.log('yt-dlp title stderr:', titleStderr);
            }

            const videoTitle = titleStdout.trim().replace(/[/\\?%*:|"<>]/g, '-'); // Sanitize the title for file system compatibility
            const outputPath = path.join(outputDir, `${videoTitle}.mp4`);

            // Step 2: Download the video using the extracted title with authentication
            const downloadCommand = `yt-dlp --username "${username}" --password "${password}" -f "bestvideo[height<=720]+bestaudio[ext=m4a]/best[height<=720]" --merge-output-format mp4 -o "${outputPath}" "${youtubeUrl}"`;
            console.log('Executing yt-dlp command:', downloadCommand);

            exec(downloadCommand, (downloadError, downloadStdout, downloadStderr) => {
                if (downloadError) {
                    console.error('Error downloading video:', downloadError);
                    return res.status(500).send('Failed to download the YouTube video.');
                }
                if (downloadStderr.includes('CAPTCHA')) {
                    console.error('CAPTCHA prompt detected. Unable to proceed:', downloadStderr);
                    return res.status(500).send('CAPTCHA prompt detected. Authentication failed.');
                }

                console.log('yt-dlp download output:', downloadStdout);
                if (downloadStderr) {
                    console.log('yt-dlp download stderr:', downloadStderr);
                }

                // Send the file to the client
                res.download(outputPath, `${videoTitle}.mp4`, (err) => {
                    if (err) {
                        console.error('Error sending the file to client:', err);
                    } else {
                        console.log('YouTube video file sent successfully');
                        // Delete the file after sending
                        fs.unlink(outputPath, (unlinkErr) => {
                            if (unlinkErr) {
                                console.error('Error deleting the file:', unlinkErr);
                            } else {
                                console.log('Downloaded file deleted from server');
                            }
                        });
                    }
                });
            });
        });
    } catch (error) {
        console.error('Error processing YouTube download:', error);
        res.status(500).send('Failed to download the YouTube video.');
    }
});

router.post('/highest-youtubequality', async (req, res) => {
    console.log('Received request to download youtube video'); 
    const youtubeUrl  = req.body.youtubeUrl;

    if (!youtubeUrl) {
        return res.status(400).send('Please provide a valid youtube video URL.');
    }

    try {
        // Define the output directory for the video
        const outputDir = path.join(__dirname, '../..', 'Downloads');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Step 1: Extract video title using yt-dlp
        const getTitleCommand = `yt-dlp --get-title "${youtubeUrl}"`;
        exec(getTitleCommand, (titleError, titleStdout, titleStderr) => {
            if (titleError) {
                console.error('Error retrieving youtube video title:', titleError);
                return res.status(500).send('Failed to retrieve video title.');
            }
            if (titleStderr) {
                console.log('yt-dlp title stderr:', titleStderr);
            }

            const videoTitle = titleStdout.trim().replace(/[/\\?%*:|"<>]/g, '-'); // Sanitize the title for file system compatibility
            const outputPath = path.join(outputDir, `${videoTitle}.mp4`);

            // Step 2: Download the video using the extracted title
            
            const downloadCommand = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4" --merge-output-format mp4 -o "${outputPath}" "${youtubeUrl}"`;
            console.log('Executing yt-dlp command:', downloadCommand);

            exec(downloadCommand, (downloadError, downloadStdout, downloadStderr) => {
                if (downloadError) {
                    console.error('Error downloading video:', downloadError);
                    return res.status(500).send('Failed to download the TikTok video.');
                }

                console.log('yt-dlp download output:', downloadStdout);
                if (downloadStderr) {
                    console.log('yt-dlp download stderr:', downloadStderr);
                }

                // Send the file to the client
                res.download(outputPath, `${videoTitle}.mp4`, (err) => {
                    if (err) {
                        console.error('Error sending the file to client:', err);
                    } else {
                        console.log('youtube video File sent successfully');
                        // Delete the file after sending
                        fs.unlink(outputPath, (unlinkErr) => {
                            if (unlinkErr) {
                                console.error('Error deleting the file:', unlinkErr);
                            } else {
                                console.log('Downloaded file deleted from server');
                            }
                        });
                    }
                });
            });
        });
    } catch (error) {
        console.error('Error processing youtube download:', error);
        res.status(500).send('Failed to download the youtube video.');
    }
});

// router.post('/getFormats', (req, res) => {
//     const { videoUrl } = req.body;

//     if (!videoUrl) {
//         return res.status(400).send({ error: 'Please provide a valid YouTube video URL.' });
//     }

//     console.log('Received video URL:', videoUrl);

//     // Use `yt-dlp --list-formats` to get the available formats
//     const command = `yt-dlp --list-formats "${videoUrl}"`;
//     exec(command, (error, stdout, stderr) => {
//         if (error) {
//             console.error('Error executing yt-dlp:', error);
//             return res.status(500).send({ error: 'Failed to fetch video formats.' });
//         }

//         try {
//             // Log the raw output of available formats
//             console.log('Available formats:\n', stdout);

//             // Send the formats list back to the client
//             res.send({ formats: stdout });
//         } catch (parseError) {
//             console.error('Error processing yt-dlp output:', parseError);
//             return res.status(500).send({ error: 'Failed to process video information.' });
//         }
//     });
// });







// Apply the rate limit middleware to the download route
// Create an Axios instance for connection reuse and retries

// POST route to download Instagram video

//currently not using the /getFormats

//


router.post('/getFormats', (req, res) => {
    const videoUrl = req.body.videoUrl;

    // Execute yt-dlp to fetch formats
    exec(`yt-dlp -F ${videoUrl}`, (error, stdout) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).json({ error: 'Failed to fetch formats' });
        }

        const output = stdout.split('\n'); // Split terminal output into lines
        console.log('The const output is:',output);
        const formats = output
            .map((line) => {
                const parts = line.trim().split(/\s{2,}/); // Split by spaces
                if (parts.length >= 7) {
                    const [id, ext, resolution, fps, , filesize, info] = parts;
                    return { id, ext, resolution, fps, filesize, info };
                }
                return null;
            })
            .filter(Boolean); // Filter out invalid entries

           // console.log('the const formats is:',formats);

        // Define preferred resolutions
        const preferredResolutions = ['256x144', '426x240', '640x360', '854x480', '1280x720', '1920x1080',];
        const bestFormats = {};

        // Find the best format for each resolution
        preferredResolutions.forEach((res) => {
            bestFormats[res] = formats
                .filter((f) => f.resolution.includes(res))
                .sort((a, b) => {
                    // Prioritize formats with a file size and better codecs
                    if (b.filesize && !a.filesize) return 1;
                    if (a.filesize && !b.filesize) return -1;
                    return parseInt(b.filesize || '0', 10) - parseInt(a.filesize || '0', 10);
                })[0]; // Pick the first (best) format
        });
        console.log("The best format is:",bestFormats);
        res.json({ bestFormats });
    });
});

router.post('/download-instaVideo', async (req, res) => {
    console.log('Received request to download Instagram video'); 
    const instaUrl  = req.body.instaUrl;

    if (!instaUrl) {
        return res.status(400).send('Please provide a valid Instagram video URL.');
    }

    try {
        // Define the output directory for the video
        const outputDir = path.join(__dirname, '../..', 'Downloads');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Step 1: Extract video title using yt-dlp
        const getTitleCommand = `yt-dlp --get-title "${instaUrl}"`;
        exec(getTitleCommand, (titleError, titleStdout, titleStderr) => {
            if (titleError) {
                console.error('Error retrieving instagram video title:', titleError);
                return res.status(500).send('Failed to retrieve video title.');
            }
            if (titleStderr) {
                console.log('yt-dlp title stderr:', titleStderr);
            }

            const videoTitle = titleStdout.trim().replace(/[/\\?%*:|"<>]/g, '-'); // Sanitize the title for file system compatibility
            const outputPath = path.join(outputDir, `${videoTitle}.mp4`);

            // Step 2: Download the video using the extracted title
            const downloadCommand = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4" --merge-output-format mp4 -o "${outputPath}" "${instaUrl}"`;
            console.log('Executing yt-dlp command:', downloadCommand);

            exec(downloadCommand, (downloadError, downloadStdout, downloadStderr) => {
                if (downloadError) {
                    console.error('Error downloading video:', downloadError);
                    return res.status(500).send('Failed to download the TikTok video.');
                }

                console.log('yt-dlp download output:', downloadStdout);
                if (downloadStderr) {
                    console.log('yt-dlp download stderr:', downloadStderr);
                }

                // Send the file to the client
                res.download(outputPath, `${videoTitle}.mp4`, (err) => {
                    if (err) {
                        console.error('Error sending the file to client:', err);
                    } else {
                        console.log('instagram video File sent successfully');
                        // Delete the file after sending
                        fs.unlink(outputPath, (unlinkErr) => {
                            if (unlinkErr) {
                                console.error('Error deleting the file:', unlinkErr);
                            } else {
                                console.log('Downloaded file deleted from server');
                            }
                        });
                    }
                });
            });
        });
    } catch (error) {
        console.error('Error processing instagram download:', error);
        res.status(500).send('Failed to download the instagram video.');
    }
});

router.post('/playVideo', (req, res) => {
    const videoUrl = req.body.videoUrl;

    if (!videoUrl) {
        return res.status(400).send('Please provide a valid video URL.');
    }

    // Use yt-dlp to get the direct video URL without downloading
    const getUrlCommand = `yt-dlp -f "best[ext=mp4]" --get-url "${videoUrl}"`;
    exec(getUrlCommand, (error, stdout, stderr) => {
        if (error) {
            console.error('Error retrieving video URL:', error);
            return res.status(500).send('Failed to retrieve video URL.');
        }

        if (stderr) {
            console.log('yt-dlp stderr:', stderr);
        }

        const directVideoUrl = stdout.trim(); // Get the direct URL
        res.json({ directVideoUrl }); // Send the URL to the client
    });
});

router.post('/download-tiktokVideo', async (req, res) => {
    console.log('Received request to download TikTok video');
    const tiktokUrl = req.body.videoUrl;
    console.log('The TikTok URL provided is:', tiktokUrl);

    try {
        // Define the output directory for the video
        const outputDir = path.join(__dirname, '../..', 'Downloads');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Step 1: Extract video title using yt-dlp
        const getTitleCommand = `yt-dlp --get-title "${tiktokUrl}"`;
        exec(getTitleCommand, (titleError, titleStdout, titleStderr) => {
            if (titleError) {
                console.error('Error retrieving video title:', titleError);
                return res.status(500).send('Failed to retrieve video title.');
            }
            if (titleStderr) {
                console.log('yt-dlp title stderr:', titleStderr);
            }

            const videoTitle = titleStdout.trim().replace(/[/\\?%*:|"<>]/g, '-'); // Sanitize the title for file system compatibility
            const outputPath = path.join(outputDir, `${videoTitle}.mp4`);

            // Step 2: Download the video using the extracted title
            const downloadCommand = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4" --merge-output-format mp4 -o "${outputPath}" "${tiktokUrl}"`;
            console.log('Executing yt-dlp command:', downloadCommand);

            exec(downloadCommand, (downloadError, downloadStdout, downloadStderr) => {
                if (downloadError) {
                    console.error('Error downloading video:', downloadError);
                    return res.status(500).send('Failed to download the TikTok video.');
                }

                console.log('yt-dlp download output:', downloadStdout);
                if (downloadStderr) {
                    console.log('yt-dlp download stderr:', downloadStderr);
                }

                // Send the file to the client
                res.download(outputPath, `${videoTitle}.mp4`, (err) => {
                    if (err) {
                        console.error('Error sending the file to client:', err);
                    } else {
                        console.log('File sent successfully');
                        // Delete the file after sending
                        fs.unlink(outputPath, (unlinkErr) => {
                            if (unlinkErr) {
                                console.error('Error deleting the file:', unlinkErr);
                            } else {
                                console.log('Downloaded file deleted from server');
                            }
                        });
                    }
                });
            });
        });
    } catch (error) {
        console.error('Error processing TikTok download:', error);
        res.status(500).send('Failed to download the TikTok video.');
    }
});

router.post('/download-twitterVideo', async (req, res) => {
    console.log('Received request to download Twitter video');
    const twitterUrl = req.body.videoUrl;
    console.log('The Twitter URL provided is:', twitterUrl);

    try {
        // Define the output directory for the video
        const outputDir = path.join(__dirname, '../..', 'Downloads');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Step 1: Extract video title using yt-dlp
        const getTitleCommand = `yt-dlp --get-title "${twitterUrl}"`;
        exec(getTitleCommand, (titleError, titleStdout, titleStderr) => {
            if (titleError) {
                console.error('Error retrieving video title:', titleError);
                return res.status(500).send('Failed to retrieve video title.');
            }
            if (titleStderr) {
                console.log('yt-dlp title stderr:', titleStderr);
            }

            const videoTitle = titleStdout.trim().replace(/[/\\?%*:|"<>]/g, '-'); // Sanitize the title for file system compatibility
            const outputPath = path.join(outputDir, `${videoTitle}.mp4`);

            // Step 2: Download the video using the extracted title
            const downloadCommand = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4" --merge-output-format mp4 -o "${outputPath}" "${twitterUrl}"`;
            console.log('Executing yt-dlp command:', downloadCommand);

            exec(downloadCommand, (downloadError, downloadStdout, downloadStderr) => {
                if (downloadError) {
                    console.error('Error downloading video:', downloadError);
                    return res.status(500).send('Failed to download the Twitter video.');
                }

                console.log('yt-dlp download output:', downloadStdout);
                if (downloadStderr) {
                    console.log('yt-dlp download stderr:', downloadStderr);
                }

                // Send the file to the client
                res.download(outputPath, `${videoTitle}.mp4`, (err) => {
                    if (err) {
                        console.error('Error sending the file to client:', err);
                    } else {
                        console.log('File sent successfully');
                        // Delete the file after sending
                        fs.unlink(outputPath, (unlinkErr) => {
                            if (unlinkErr) {
                                console.error('Error deleting the file:', unlinkErr);
                            } else {
                                console.log('Downloaded file deleted from server');
                            }
                        });
                    }
                });
            });
        });
    } catch (error) {
        console.error('Error processing Twitter video download:', error);
        res.status(500).send('Failed to download the Twitter video.');
    }
});





// https://youtu.be/4lHAyiUuckY
// https://www.youtube.com/watch?v=BEskYHiyl8E



module.exports = router;