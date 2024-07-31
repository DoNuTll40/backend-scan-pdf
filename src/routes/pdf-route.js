
const express = require("express");
const router = express.Router();
const multer = require('multer');
const pdfControllers = require("../controllers/pdf-controller");
const authenticate = require("../middlewares/authenticate");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/pdf', authenticate, pdfControllers.getApiPDF);

router.get('/pdf/new', authenticate, pdfControllers.getNewFile);

router.get('/pdf/year', authenticate, pdfControllers.getFolderYear);

router.get('/pdf/month/:year', authenticate, pdfControllers.getFolderMonth);

router.get('/pdf/*', pdfControllers.getShowPDF);

router.patch('/pdf/rename', authenticate, pdfControllers.renameApiPDF)

router.delete('/pdf/*', authenticate, pdfControllers.deleteApiPDF);

router.post('/pdf', authenticate, upload.array('files'), pdfControllers.postApiPDF);



module.exports = router;