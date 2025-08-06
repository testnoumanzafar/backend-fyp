const express = require('express');
const router = express.Router();
 
const { MessageCome, MessageSend } = require('../Controller/messageController');
const upload = require('../middleware/multer');

// Save message to DB
router.post('/',   upload.fields([
    { name: 'file', maxCount: 1 },      // image or document
    { name: 'voice', maxCount: 1 },     // audio message
  ]),MessageCome  );
 
router.get('/', MessageSend);

module.exports = router;
