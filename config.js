require('dotenv').config();

module.exports = {
    port: process.env.SERVER_PORT || 3000,
    VIMEO_ACCESS_TOKEN: process.env.VIMEO_ACCESS_TOKEN
};