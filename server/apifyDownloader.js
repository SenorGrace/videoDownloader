const { ApifyClient } = require('apify-client');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Ensure axios is required

// Initialize the ApifyClient with API token
const client = new ApifyClient({
    token: process.env.APIFY_TOKEN,
});

const runApifyActor = async (instaUrl) => {
    const ACTOR_ID = process.env.ACTOR_ID; // Get the actor ID from the environment variable

    // Prepare Actor input
    const input = {
        id: "IUA1hnPbSnwF7w1Rl", // Replace with a unique identifier if required
        instaUrl: [
            { url: instaUrl }
        ],
        downloadFormat: "mp4",
        maxVideos: 1 // Change this to 1 since you're downloading one video at a time
    };

    try {
        // Run the Actor and wait for it to finish
        const run = await client.actor(ACTOR_ID).call(input);

        // Fetch results from the run's dataset (if any)
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        console.log('the items gotten are:', items);
        const videoUrl = items[0]?.videoUrl; // Assuming the output is in the first dataset item

        if (!videoUrl) {
            throw new Error('No video URL found in the output.');
        }

        // Download the video to the local machine
        const videoPath = path.resolve(__dirname, 'Downloads', 'instagram-video.mp4');
        const writer = fs.createWriteStream(videoPath);

        const videoResponse = await axios({
            url: videoUrl,
            method: 'GET',
            responseType: 'stream',
        });

        // Pipe the video stream to a file
        videoResponse.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(videoPath));
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Failed to run Apify actor:', error.message);
        throw new Error('Unable to download video. Please try again.');
    }
};

module.exports = { runApifyActor };
