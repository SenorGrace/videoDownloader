# Instagram Video Downloader
## Description
Downloads Instagram videos, reels, and other media types.

## Input Schema
- `instaUrl`: The URL of the Instagram post, reel, or video you want to download.

## Usage
To download content using the Apify actor, provide a valid URL in the request body. The URL can point to any content type supported by the actor, including:

- Instagram video URLs
- Instagram reel URLs
- Other valid URLs pointing to media

### Example Requests

**1. Downloading an Instagram Video**
```json
[
   {
      "instaUrl": "https://www.instagram.com/p/VIDEO_POST_ID/"
   },
   {
      "instaUrl": "https://www.instagram.com/reel/REEL_ID/?utm_source=ig_web_copy_link"
   },
   {
      "instaUrl": "https://www.instagram.com/tv/IGTV_VIDEO_ID/"
   }
]