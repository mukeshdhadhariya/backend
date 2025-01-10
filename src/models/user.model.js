import mongoose ,{Schema} from "mongoose";

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
        type:string,//cloudinary url
        required:true
    },
    coverimage:{
        type:string,
    },
    watchHistory:[
    {
    type:Schema.Types.ObjectId,
    ref:"Video"
    }
   ],
   password:{
    type:string,
    required:[true,"Password is required"]
   },
   refreshtoken:{
    type:string
   }

},{
    timestamps:true
})

export const User=mongoose.model("User",userschema)