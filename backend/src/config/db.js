const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Process.env to grab the secure string from your .env file
        const conn = await mongoose.connect(process.env.MONGO_URI);
        
        console.log(`MongoDB Cloud Connected successfully: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        // If the database fails to connect, we kill the server process to prevent silent errors
        process.exit(1); 
    }
};

module.exports = connectDB;
