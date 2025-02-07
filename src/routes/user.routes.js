import {Router} from "express"
import{ loginUser,
        logoutUser, 
        registerUser,
        refreshAccessToken,
        ChnageCurrentPassword ,
        getCurrentUser,
        upadateAccountDetail,
        upadateUserAvatar,
        upadatecoverimage,
        getUserChannelProfile,
        getUserWatchHistory
    } from "../controllers/user.controller.js"

import {upload} from "../middlewares/multer.middleware.js"
import {jwtVerfy} from "../middlewares/auth.middleware.js"


const router=Router()

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverimage",
            maxCount:1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)

router.route("/logout").post(jwtVerfy,logoutUser)

router.route("/refresh-token").post(refreshAccessToken)

router.route("/change-password").post(jwtVerfy,ChnageCurrentPassword)

router.route("/current-user").get(jwtVerfy,getCurrentUser)

router.route("/update-account").patch(jwtVerfy,upadateAccountDetail)

router.route("/avatar").patch(jwtVerfy,upload.single("avatar"),upadateUserAvatar)

router.route("/coverimage").patch(jwtVerfy,upload.single("coverimage"),upadatecoverimage)

router.route("/c/:username").get(verifyJWT, getUserChannelProfile)

router.route("/history").get(verifyJWT, getUserWatchHistory)


export default router