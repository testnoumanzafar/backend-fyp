 
const Group = require("../models/group.js");
const GroupMessage = require("../models/groupMessage.js");

const NewUser = require("../models/register.js")

   const  createGroup = async (req, res) => {
  try {
    const { name, memberIds, adminId } = req.body;
    const picture = req.file?.location;

    if (!name || !adminId || !memberIds) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const adminUser = await NewUser.findById(adminId);
    if (adminUser.email !== 'nouman@gmail.com') {
      return res.status(403).json({ error: 'Only admin can create groups' });
    }

    const group = new Group({
      name,
      admin: adminId,
      picture,
      members: [adminId, ...JSON.parse(memberIds)]
    });

    await group.save();
    res.status(201).json(group);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Group creation failed' });
  }
};

 
// const sendGroupMessage = async (req, res) => {
//   try {
//     const { groupId, sender, text } = req.body;
//     const fileUrl = req.files?.file?.[0]?.location;
//     const voiceUrl = req.files?.voice?.[0]?.location;

//     const message = new GroupMessage({
//       group: groupId,
//       sender,
//       text,
//       fileUrl,
//       voiceUrl
//     });

//     await message.save();

//     // ✅ This populates sender before emitting to frontend
//     const populatedMessage = await message.populate('sender');

//     res.status(200).json(populatedMessage);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };


const sendGroupMessage = async (req, res) => {
  try {
    const { groupId, sender, text } = req.body;
    const fileUrl = req.files?.file?.[0]?.location;
    const voiceUrl = req.files?.voice?.[0]?.location;

    const message = new GroupMessage({
      group: groupId,
      sender,
      text,
      fileUrl,
      voiceUrl,
    });

    await message.save();

    // ✅ Populate sender
    const populatedMessage = await message.populate('sender');

    // ✅ Add group field manually
    const messageWithGroup = {
      ...populatedMessage._doc,
      group: groupId,
    };

    res.status(200).json(messageWithGroup); // Send to sender

    // ✅ Emit message to all group members
    const io = req.app.get('io'); // 👈 get io instance
    io.to(groupId).emit('receiveGroupMessage', messageWithGroup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


  const  getGroupMessages = async (req, res) => {
  try {
    const messages = await GroupMessage.find({ group: req.params.groupId }).populate('sender');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

 const removeUserFromGroup = async (req, res) => {
  try {
    const { groupId, adminId, userId } = req.body;

    const group = await Group.findById(groupId);
    if (group.admin.toString() !== adminId) return res.status(403).json({ error: 'Unauthorized' });

    group.members.pull(userId);
    await group.save();

    res.json({ success: true, updatedGroup: group });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const getUserGroups = async (req, res) => {
  try {
    const userId = req.params.userId;

    const groups = await Group.find({ members: userId })
      .populate('admin', 'name email')
      .populate('members', 'name email picture');

    res.json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
};


const deleteGroup = async (req, res) => {
  try {
    const { groupId, adminId } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (group.admin.toString() !== adminId) {
      return res.status(403).json({ error: "Only the admin can delete this group" });
    }

    // Delete all messages in the group
    await GroupMessage.deleteMany({ group: groupId });

    // Delete the group itself
    await Group.findByIdAndDelete(groupId);

    res.json({ message: "Group deleted successfully" });
  } catch (err) {
    console.error("Delete group error:", err);
    res.status(500).json({ error: "Failed to delete group" });
  }
};

module.exports = { removeUserFromGroup, getGroupMessages,sendGroupMessage,createGroup ,getUserGroups, deleteGroup };