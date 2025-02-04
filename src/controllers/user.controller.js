import {AsyncHandler} from "../utils/AsyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponce} from "../utils/ApiResponce.js"

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

    const {accessToken, refreshToken}=genrateaccesstokenandrefreshtoken(user._id)

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

export {registerUser,loginUser,logoutUser}