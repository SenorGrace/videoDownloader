require('dotenv').config();
const express = require('express');
const router = express.Router();
const { PlaywrightCrawler } = require('crawlee'); // or 'apify'
const { addExtra } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// Add stealth plugin to Playwright
const playwright = addExtra(require('playwright'));
const stealth = StealthPlugin();
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

router.post('/playYoutubeVideo', (req, res) => {
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
    console.log('Received request to download youtube video'); 
    const youtubeUrl  = req.body.youtubeUrl;
    console.log("The youtube url received at router.post('/high-youtubequality is: ", youtubeUrl)

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
            const downloadCommand = `yt-dlp -f "bestvideo[height<=720]+bestaudio[ext=m4a]/best[height<=7200]" --merge-output-format mp4 -o "${outputPath}" "${youtubeUrl}"`;

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






// router.post('/download-instaVideo', limiter, async (req, res) => {
//     let { videoUrl } = req.body;

//     console.log('Instagram video URL received:', videoUrl);

//     if (!videoUrl) {
//         return res.status(400).json({ message: 'Invalid Instagram video URL' });
//     }

//     try {
//         // Launch Puppeteer browser
//         const browser = await puppeteer.launch({ headless: true });
//         const page = await browser.newPage();

//         // Go to Instagram login page
//         await page.goto('https://www.instagram.com/accounts/login/');

//         // Log in to Instagram using credentials from .env file
//         await page.type('input[name="username"]', process.env.INSTAGRAM_USERNAME);
//         await page.type('input[name="password"]', process.env.INSTAGRAM_PASSWORD);
//         await page.click('button[type="submit"]');

//         // Wait for navigation after login
//         await page.waitForNavigation();

//         // Go to the Instagram video URL
//         await page.goto(videoUrl);

//         // Handle pop-up (if any)
//         try {
//             await page.waitForSelector('.RnEpo .wpO6b', { timeout: 5000 });
//             await page.click('.RnEpo .wpO6b'); // Click the close button on the pop-up
//         } catch (error) {
//             console.log("No pop-up detected, continuing...");
//         }

//         // Wait for the video element to load and get its source URL
//         const videoSrc = await page.evaluate(() => {
//             const video = document.querySelector('video');
//             return video ? video.src : null;
//         });

//         if (!videoSrc) {
//             throw new Error('Video URL not found');
//         }

//         console.log('Scraped video URL:', videoSrc);

//         // Close the Puppeteer browser
//         await browser.close();

//         // Download the video using Axios
//         const response = await axios({
//             url: videoSrc,
//             method: 'GET',
//             responseType: 'stream'
//         });

//         // Define the path where the video will be temporarily saved
//         const outputPath = path.join(__dirname, '../Downloads', 'insta-video.mp4');
//         const writer = fs.createWriteStream(outputPath);

//         // Pipe the video stream to the file
//         response.data.pipe(writer);

//         // When the download finishes, send the video file to the client
//         writer.on('finish', () => {
//             res.setHeader('Content-Type', 'video/mp4');
//             res.setHeader('Content-Disposition', 'attachment; filename="insta-video.mp4"');

//             // Send the video file to the client
//             res.download(outputPath, 'insta-video.mp4', (err) => {
//                 if (err) {
//                     console.error('Error sending the video file:', err);
//                     return res.status(500).json({ message: 'Error downloading video' });
//                 }

//                 // Clean up: delete the downloaded file after sending
//                 fs.unlinkSync(outputPath);
//             });
//         });

//         // Error handling for writer
//         writer.on('error', (err) => {
//             console.error('Error writing the video file:', err);
//             return res.status(500).json({ message: 'Error saving video file' });
//         });

//     } catch (error) {
//         console.error('Error during the download process:', error);
//         res.status(500).json({ message: 'Internal server error', error: error.message });
//     }
// });



module.exports = router;