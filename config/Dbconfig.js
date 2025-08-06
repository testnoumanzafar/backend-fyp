const mongoose = require('mongoose');
const dotenv = require('dotenv').config();

const DBconnection = async () => {
    try {
        const connect = await mongoose.connect(process.env.MONGODB_CONNECTION_STRING)
        console.log(`MongoDB connected: ${connect.connection.host}`);
    } catch (error) {
        console.log(`MongoDB connection error: ${error.message}`);
        process.exit(1); // Exit the process with failure
        
    }
}
module.exports = DBconnection;