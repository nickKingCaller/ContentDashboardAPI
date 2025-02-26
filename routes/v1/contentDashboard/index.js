const express = require('express');
const config = require('../../../config');
const youtubedl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const router = express.Router();
const { uploadFile } = require('../../../utilities/googleDriveService');

const YoutubeDownload = async (req, res, next) => {
    const videoUrl = req.query.url;
    if (!videoUrl) {
        return res.status(400).json({ error: 'Missing url query parameter' });
    }

    try {
        // Define a safe, accessible download path
        const downloadDir = path.join(__dirname, '../../../downloads');
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir, { recursive: true }); // Create folder if not exists
        }

        // Define output file path
        const outputPath = path.join(downloadDir, '%(title)s.%(ext)s');

        // Run youtube-dl and wait for completion
        await youtubedl(videoUrl, {
            output: outputPath,
        });

        // Get the actual filename by extracting it from the result
        const downloadedFile = fs.readdirSync(downloadDir)
            .filter(file => file.endsWith('.mp4') || file.endsWith('.mkv') || file.endsWith('.webm')) // Adjust for expected formats
            .map(file => path.join(downloadDir, file))
            .sort((a, b) => fs.statSync(b).mtime - fs.statSync(a).mtime)[0]; // Get the latest file

        if (!downloadedFile) {
            return res.status(500).json({ error: 'Download failed, file not found' });
        }

        // Extract filename and mime type
        const fileName = path.basename(downloadedFile);
        const mimeType = 'video/mp4'; // Adjust based on file type if needed

        // Upload the file to Google Drive
        const uploadedFile = await uploadFile(downloadedFile, fileName, mimeType, '1uAfwWc7OsT_6D9ePhgCMFxYjLm781QM6');

        // Send success response with Drive file details
        res.status(200).json({
            message: 'File downloaded and uploaded to Google Drive successfully',
            driveFile: uploadedFile,
        });

        // Optional: Delete local file after successful upload
        fs.unlinkSync(downloadedFile);
        console.log('Local file deleted:', downloadedFile);

    } catch (error) {
        res.status(500).json({ error: 'Failed to download video', details: error.message, fullError: error });
    }
};

// Function to fetch Vimeo video download links
const getVimeoDownloadLink = async (videoId) => {
  const vimeoApiUrl = `https://api.vimeo.com/videos/${videoId}`;

  try {
        const response = await axios.get(vimeoApiUrl, {
            headers: {
                Authorization: `Bearer ${config.VIMEO_ACCESS_TOKEN}`,
            },
            params: {
                fields: 'name,download', // Passing query parameters here
            },
        });

      const { download,name } = response.data;
      if (!download || download.length === 0) {
          throw new Error('No downloadable versions available for this video.');
      }

      // Filter versions up to 720p and choose the highest available
        const bestDownload = download
            .filter((video) => video.width <= 720) // Get only 720p or lower
            .sort((a, b) => b.width - a.width)[0]; // Get the highest quality below 720p
            
      return {
          quality: bestDownload.quality,
          type: bestDownload.type,
          url: bestDownload.link,
          name: name,
      };
  } catch (error) {
      console.error('Error fetching Vimeo video:', error);
      throw new Error(error.message || 'Failed to fetch video details.');
  }
};

// Function to download video locally
const downloadVideo = async (videoUrl, savePath) => {
    const writer = fs.createWriteStream(savePath);

    const response = await axios({
        url: videoUrl,
        method: 'GET',
        responseType: 'stream',
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
};


// API route to get Vimeo video download link
const VimeoDownload = async (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl) {
      return res.status(400).json({ error: 'Missing URL query parameter' });
  }

  // Extract Vimeo video ID from the URL
  const videoIdMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
  if (!videoIdMatch) {
      return res.status(400).json({ error: 'Invalid Vimeo URL' });
  }
  const videoId = videoIdMatch[1];

  try {
      const downloadInfo = await getVimeoDownloadLink(videoId);

      const fileName = downloadInfo.name;

      const downloadDir = path.join(__dirname, '../../../downloads');
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir, { recursive: true }); // Create folder if not exists
        }

      const downloadPath = path.join(downloadDir, `${fileName}.mp4`);
      
      await downloadVideo(downloadInfo.url, downloadPath);

      const mimeType = downloadInfo.type; // Adjust based on file type if needed

      // Upload the file to Google Drive
      const uploadedFile = await uploadFile(downloadPath, fileName, mimeType, '12GSyBg4cACTczRZ8sn81HMUkuMpqa9PQ');

      fs.unlinkSync(downloadPath);
      
      // Send success response with Drive file details
      res.status(200).json({
        message: 'File downloaded and uploaded to Google Drive successfully',
        driveFile: uploadedFile,
    });

  } catch (error) {
      res.status(500).json({ error: error.message });
  }
};

/**
 * @swagger
 * /v1/contentDashboard/youtube-download:
 *   get:
 *     tags: [contentDashboard]
 *     summary: Download video using a link.
 *     description: >
 *       Returns the output file of the video.
 *     parameters:
 *       - name: url
 *         in: query
 *         required: true
 *         description: The video URL
 *     responses:
 *       200:
 *         description: Successfully downloaded video
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: No URL provided
 *       500:
 *         description: Download error
 */
router.get('/youtube-download', YoutubeDownload);

/**
 * @swagger
 * /v1/contentDashboard/vimeo-download:
 *   get:
 *     tags: [contentDashboard]
 *     summary: Retrieve Vimeo video download link.
 *     description: >
 *       Fetches the highest-quality available download link for a given Vimeo video.
 *     parameters:
 *       - name: url
 *         in: query
 *         required: false
 *         description: The Vimeo video URL
 *     responses:
 *       200:
 *         description: Successfully retrieved video download link
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 videoId:
 *                   type: string
 *                 downloadInfo:
 *                   type: object
 *                   properties:
 *                     quality:
 *                       type: string
 *                     type:
 *                       type: string
 *                     url:
 *                       type: string
 *       400:
 *         description: Invalid or missing URL
 *       500:
 *         description: Processing error
 */
router.get('/vimeo-download', VimeoDownload);

module.exports = router;
