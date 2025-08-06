const express = require('express');
const { Register, Login, fetchallUser, getProfile } = require('../Controller/authController');
 const upload = require("../middleware/multer.js")
 const authenticateUser = require('../middleware/auth.js')
const userRouter = express.Router();

userRouter.post('/register',upload.single("picture"),  Register);
userRouter.post('/login', Login);
userRouter.get('/fetch', fetchallUser);


userRouter.get("/profile", authenticateUser, getProfile);

module.exports = userRouter;
 