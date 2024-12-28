import mongoose from "mongoose";
import {DB_NAME} from "../constant.js"

const connectDB=async ()=>{
    try {
        const connectioninstance=await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        console.log(`\n mongodb connected !! DB host ${connectioninstance.connection.host}`);
    } catch (error) {
        console.log("Mongodb connnection error : ",error);
        process.exit(1)
    }
}

export default connectDB;
