const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');
const {
  createGroup,
  sendGroupMessage,
  getGroupMessages,
  removeUserFromGroup,
  getUserGroups,
  deleteGroup,
  deleteMemberFromGroup
} = require('../Controller/groupController');
// const { createGroup } = require('../Controller/groupController');

router.post('/create', upload.single('groupImage'), createGroup);
router.post('/message', upload.fields([{ name: 'file' }, { name: 'voice' }]), sendGroupMessage);
router.get('/messages/:groupId', getGroupMessages);
router.get('/user/:userId', getUserGroups); 

router.put('/remove-user', removeUserFromGroup); // admin only
router.delete('/delete', deleteGroup);
router.delete("/:groupId/members/:userId", deleteMemberFromGroup);

module.exports = router;
