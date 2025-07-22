import {asyncHandler} from "./../utils/asyncHandler.js";
import {apiError} from "./../utils/apiError.js";
import User from "./../models/user.model.js";

const registerUser = asyncHandler( async () => {
    const registerUser = asyncHandler( async(req,res) => {
        const {fullName,email,username,password} = req.body;

        if([fullName,email,username,password].some((feild)=>{ feild?.trim() == ""})) {
            throw new apiError(400,"All fields are Required.");
        }

        const existedUser = User.findOne({
            $or: [{username},{email}]
        });

        if(existedUser) {
            throw new apiError(409,"User already exist.");
        }
    } )
});

export {registerUser};