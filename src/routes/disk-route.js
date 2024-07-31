
const express = require("express");
const diskController = require("../controllers/disk-controller");
const router = express.Router();

router.get('/disk-info', diskController.getDiskInfo)

module.exports = router;