import {asyncHandler} from "./../utils/asyncHandler.js";

const register = asyncHandler( async () => {
    res.ststus(200).json({message:"Done!!!"});
});

export {register};