const fs = require('fs');
const { google } = require('googleapis');
const config = require('../config');

const credentials = JSON.parse(config.DRIVE_ACCESS);

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

/**
 * Upload a file to Google Drive
 * @param {string} filePath - The local file path
 * @param {string} fileName - The name for the uploaded file in Drive
 * @param {string} mimeType - The file's MIME type (e.g., 'image/jpeg')
 * @param {string} folderId - The ID of the destination Google Drive folder
 * @returns {Promise<Object>} - Uploaded file details
 */
const uploadFile = async (filePath, fileName, mimeType, folderId) => {
    try {
        const requestBody = {
            name: fileName,
            mimeType: mimeType,
            parents: folderId ? [folderId] : [], // Add folderId if provided
        };

        const response = await drive.files.create({
            requestBody,
            media: {
                mimeType,
                body: fs.createReadStream(filePath),
            },
            fields: 'id, name, webViewLink, webContentLink',
        });

        return response.data; // Return uploaded file details
    } catch (error) {
        console.error('Error uploading file to Google Drive:', error.message);
        throw new Error(error.message);
    }
};

// Export the function
module.exports = { uploadFile };
