const express = require('express');
const router = express.Router();

const contentDashboardRoutes = require('./contentDashboard'); // Make sure this path is correct

router.use('/contentDashboard', contentDashboardRoutes); // Mount the contentDashboard route

module.exports = router;
