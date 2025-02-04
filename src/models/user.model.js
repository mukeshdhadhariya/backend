import mongoose ,{Schema} from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const  userschema=new Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
    },
    fullname:{
        type:String,
        required:true,
        trim:true,
        index:true
    },
    avatar:{
        type:String,
        required:true
    },
    coverimage:{
        type:String,
    },
    watchHistory:[
    {
    type:Schema.Types.ObjectId,
    ref:"Video"
    }
   ],
   password:{
    type:String,
    required:[true,"Password is required"]
   },
   refreshToken:{
    type:String
   }

},{
    timestamps:true
})

userschema.pre("save", async function (next){
    if(!this.isModified("password"))return next();

    this.password=await bcrypt.hash(this.password,10)
    next()
})

userschema.methods.isPasswordCorrect=async function(password){
    return await bcrypt.compare(password,this.password)
}

userschema.methods.genrateAccessToken = function () {
    try {
        if (!process.env.ACCESS_TOKEN_SECRET || !process.env.ACCESS_TOKEN_EXPIRY) {
            throw new Error("Environment variables for token generation are missing");
        }

        return jwt.sign(
            {
                _id: this._id,
                email: this.email,
                username: this.username,
                fullname: this.fullname,
            },
            process.env.ACCESS_TOKEN_SECRET,
            {
                expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
            }
        );
    } catch (error) {
        throw new Error("Failed to generate access token");
    }
};

userschema.methods.refreshAccessToken = function () {
    try {
        if (!process.env.REFRESH_TOKEN_SECRET || !process.env.REFRESH_TOKEN_EXPIRY) {
            throw new Error("Environment variables for refresh token generation are missing");
        }

        return jwt.sign(
            {
                _id: this._id,
            },
            process.env.REFRESH_TOKEN_SECRET,
            {
                expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
            }
        );
    } catch (error) {
        throw new Error("Failed to generate refresh token");
    }
};


export const User=mongoose.model("User",userschema)