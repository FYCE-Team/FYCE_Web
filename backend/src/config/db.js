import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            maxPoolSize: 20,
            waitQueueTimeoutMS: 5000,
            serverSelectionTimeoutMS: 10000
        });

        console.log(
            "MongoDB connected successfully"
        );

        console.log(
            "Database name:",
            mongoose.connection.name
        );
    } catch (error) {
        console.error(
            "MongoDB connection failed:",
            error.message
        );

        throw error;
    }
};

export default connectDB;
