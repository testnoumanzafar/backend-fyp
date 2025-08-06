// const multer = require("multer");

// const storage = multer.diskStorage({}); // Customize this if needed
// const upload = multer({ storage });

// module.exports = upload;

const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
require('dotenv').config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    // acl: 'public-read',
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    // key: function (req, file, cb) {
    //   cb(null, `profile_images/${Date.now()}-${file.originalname}`);
    // },
    key: function (req, file, cb) {
  const path = req.body.groupId ? `group_files/${req.body.groupId}` : 'profile_images';
  cb(null, `${path}/${Date.now()}-${file.originalname}`);
}

  }),
});

module.exports = upload;