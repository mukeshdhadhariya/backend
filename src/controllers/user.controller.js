import {AsyncHandler} from "../utils/AsyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponce} from "../utils/ApiResponce.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const genrateaccesstokenandrefreshtoken = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const accessToken = user.genrateAccessToken();
        const refreshToken = user.refreshAccessToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access tokens");
    }
};



const registerUser=AsyncHandler(async (req,res)=>{
    const {username,email,fullname,password}=req.body
    

    if(
        [username,email,fullname,password].some((field)=>  field?.trim()==="")
    ){
        throw new ApiError(400,"fill all details")
    }

    const existedUser=await User.findOne({
        $or:[{ username },{ email }]
    })
    
    if(existedUser){
        throw new ApiError(409,"user with email and username already exists")
    }

    const avatarlocalpath=req.files?.avatar[0]?.path
    // const coverimagelocalpath=req.files?.coverimage[0]?.path

    let coverimagelocalpath;

    if(req.files && Array.isArray(req.files.coverimage) && req.files.coverimage.length>0){
        coverimagelocalpath=req.files.coverimage[0].path
    }

    if(!avatarlocalpath){
        throw new ApiError(400,"avatar is required")
    }

    const avatar=await uploadOnCloudinary(avatarlocalpath)
    const coverimage=await uploadOnCloudinary(coverimagelocalpath)

    if(!avatar){
        throw new ApiError(400,"avatar is required")
    }

    const user=await User.create({
        fullname,
        avatar:avatar.url,
        coverimage:coverimage?.url || "",
        email,
        password,
        username:username.toLowerCase(),
    })

    const CreatedUser=await User.findById(user._id).select(
        "-password -refreshtoken"
    )

    if(!CreatedUser){
        throw new ApiError(500,"somthing went wrong while user register")
    }

    return res.status(201).json(
        new ApiResponce(200,CreatedUser,"user created succesfully")
    )

})


const loginUser=AsyncHandler(async (req,res)=>{

    const {email,password,username} =req.body

    if(!email && !username){
        throw new ApiError(400,"username or email is required ")
    }

    const user=await User.findOne({
        $or:[{username},{email}]
    })
    

    if(!user){
        throw new ApiError(404,"user does not exist")
    }

    const isPasswordValid=await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(404,"Password is incorrect")
    }

    const {accessToken, refreshToken}=await genrateaccesstokenandrefreshtoken(user._id)

    const loggedinUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const options={
        httpOnly:true,
        secure:true
    }// can see cookies on frontend but modified by only backend(server)  without this frontend also can change cookies

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponce(
            200,
            {
                user:loggedinUser,accessToken,refreshToken
            },
            "user loged In successfully"
        )
    )

})

const logoutUser=AsyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{refreshToken:undefined}
        },{
            new:true
        }
    )

    const options={
        httpOnly:true,
        secure:true
    }

    return res.
    status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponce(200,{}," user logged out ")
    )

})

const refreshAccessToken=AsyncHandler(async(req,res)=>{
    const incommingRefreshToken=req.cookies.refreshToken || req.body.refreshToken

    if(!incommingRefreshToken){
        throw new ApiError(401,"unauthorize request");
    }

   try {
     const decodedToken=jwt.verify(
         incommingRefreshToken,
         process.env.REFRESH_TOKEN_SECRET
     )
 
     const user=await User.findById(decodedToken?._id)
 
     if(!user){
         throw new ApiError(401,"invalid refresh token");
     }
 
     if(incommingRefreshToken !== user?.refreshToken){
         throw new ApiError(401,"Refresh token invaild or used")
     }
 
     const options={
         httpOnly:true,
         secure:true
     }
 
     const { accessToken, newrefreshToken }=await genrateaccesstokenandrefreshtoken(user?._id);
 
     return res.status(200)
     .cookie("accessToken",accessToken,options)
     .cookie("newrefreshToken",newrefreshToken,options)
     .json(
         new ApiResponce(
             200,
             {accessToken,refreshToken:newrefreshToken},
             "access token refreshed"
         )
     )
   } catch (error) {
    throw new ApiError(401,error?.message || "some error accure when token refresh")
   }



})

const ChnageCurrentPassword=AsyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body

    const user=await User.findById(req.user?._id)

    const isPasswordCorrect=await isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(401,"Password incorrect")
    }

    user.password=newPassword;
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponce(200,{},"Password changed successfully"))


})

const getCurrentUser=AsyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(
        new ApiResponce(200,req.user,"User fetch successfully")
    )
})

const upadateAccountDetail=AsyncHandler(async(req,res)=>{

    const {fullname,email}=req.body;

    if(!fullname || !email){
        throw new ApiError(401,"fullname or email is empty");
    }

    const user=User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                fullname,
                email:email
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponce(200,user,"user details Upadated successfully")
    )

})

const upadateUserAvatar=AsyncHandler(async(req,res)=>{
    const avatarlocalpath=req.file?.path

    if(!avatarlocalpath){
        throw new ApiError(200,"Local file path does not find")
    }
    const avatar=await uploadOnCloudinary(avatarlocalpath)

    if(!avatar?.url){
        throw new ApiError(200,"error when file upload on cloudinary")
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200).json(
        new ApiResponce(200,user,"avatar upaded successfully")
    )
})

const upadatecoverimage=AsyncHandler(async(req,res)=>{
    const coverimagelocalpath=req.file?.path

    if(!coverimagelocalpath){
        throw new ApiError(200,"Local file path does not find")
    }
    const coverimage=await uploadOnCloudinary(coverimagelocalpath)

    if(!coverimage?.url){
        throw new ApiError(200,"error when file upload on cloudinary")
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverimage:coverimage.url
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200).json(
        new ApiResponce(200,user,"coverimage updated successfully")
    )
})

const getUserChannelProfile=AsyncHandler(async(req,res)=>{

    const {username}=req.params;

    if(!username?.trim()){
        throw new ApiError(401,"User is missing");
    }

    const channel=await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id", 
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id", 
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                SubscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullname:1,
                username:1,
                SubscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverimage:1,
                email:1
            }
        }
    ])

    console.log(channel);

    if(!channel?.length){
        throw new ApiError(401,"channel does not exist")
    }

    return res
    .status(200)
    .json(
        new ApiResponce(200,channel,"user channel fetched successfully")
    )

})

const getUserWatchHistory=AsyncHandler(async(req,res)=>{
    const user=await User.aggregate(
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id)
            },
        },
        {
            $lookup:{
                form:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipline:[
                    {
                        $lookup:{
                            form:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipline:[
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner",
                            }
                        }
                    }
                ]
            }
        }
    )

    return res
    .status(200)
    .json(
        new ApiResponce(200,user[0].watchHistory,"watchHistory find successfully")
    )
})

export {
        registerUser,
        loginUser,
        logoutUser,
        refreshAccessToken,
        ChnageCurrentPassword,
        getCurrentUser,
        upadateAccountDetail,
        upadateUserAvatar,
        upadatecoverimage,
        getUserChannelProfile,
        getUserWatchHistory
}