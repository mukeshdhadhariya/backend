import {AsyncHandler} from "../utils/AsyncHandler.js"


const registerUser=AsyncHandler(async (req,res)=>{
    const {username,email,fullname,password}=req.body
    // console.log(email, password);
})

export {registerUser}