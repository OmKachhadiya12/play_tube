import { asyncHandler } from "./../utils/asyncHandler.js";
import { apiError } from "./../utils/apiError.js";
import User from "./../models/user.model.js";
import {uploadOnCloudinary} from "./../utils/cloudinary.js";
import {apiResponse} from "./../utils/apiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshToken =  async(userId) => {
  try{
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave: false});

    return {accessToken,refreshToken};

  }catch(error) {
    throw new apiError(500,"Something went wrong.");
  }
}


const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body;
    
  if ([fullName, email, username, password].some((field) => {field?.trim() == "";})) {
    throw new apiError(400, "All fields are Required.");
}

const existedUser = await User.findOne({
    $or: [{ username }, { email }],
});

  if (existedUser) {
      throw new apiError(409, "User already exist.");
    }
    
    const avatarLocalPath = req.files?.avatar[0].path;
    const coverImageLocalPath = req.files?.coverImage[0].path;

  if(avatarLocalPath) {
    throw new apiError(400,"Avatar is required.");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if(!avatar) {
    throw new apiError(400,"Avatar is required.");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  });

  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  if(!createdUser) {
    throw new apiError(500,"Something went wrong.");
  }

  return res.status(200).json(
    new apiResponse(200,createdUser,"User created sucessfully.")
  )

});


const loginUser = asyncHandler(async(req,res) => {
  const {username,email,password} = req.body;

  if(!(username || email)) {
    throw new apiError(400,"Username or Email is required.");
  }

  const user = await User.findOne({
    $or: [{username},{email}]
  });

  if(!user) {
    throw new apiError(404,"User not found.");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if(!isPasswordValid) {
    throw new apiError(401,"Username or Password is Incorrect.");
  }

  const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true
  }

  return res.status(200).cookie("accessToken", accessToken,options).cookie("refreshToken",refreshToken,options).json(
    200,{ user: loggedInUser,accessToken,refreshToken},"User loggedIn sucessfully."
  );

});


const logoutUser = asyncHandler(async(req,res) => {
  await User.findByIdAndUpdate(req.user._id,
    { $set: { refreshToken: undefined } },
    { new: true });

    const options = {
      httpOnly: true,
      secure: true
    }

    return res.status.clearCookie("accessToken",options).clearCookie("refreshToken",options).json(
      new apiResponse(200,{},"User logged out. "
      ));

});


const refreshAccessToken = asyncHandler(async(req,res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if(!incomingRefreshToken) {
    throw new apiError(401,"Unauthorized request.")
  }

  const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);

  const user = await User.findById(decodedToken._id);
  if(!user) {
    throw new apiError(401,"Invalid refresh token.");
  }

  if(incomingRefreshToken !== user.refreshToken) {
    throw new apiError(401,"Refresh token is expired.");
  }

  const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id);

  const options = {
    httpOnly: true,
    secure: true
  }

  return res.status(200),cookie("accesstoken",accessToken,options).cookie("refreshToken",refreshToken,options).json(
    new apiResponse(200,{accessToken,refreshToken},"New Access and Refresh tokens.")
  );

});


const changeCurrentPassword = asyncHandler(async(req,res) => {
  const {oldPassword,newPassword} = req.body;

  if (!oldPassword || !newPassword) {
    throw new apiError(400, "Old password and new password are required.");
  }

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if(!isPasswordCorrect) {
    throw new apiError(400,"Invalid Old Password.");
  }

  user.password = newPassword;
  await user.save({validateBeforeSave: false});

  return res.status(200).json(new apiResponse(200,{},"Password changed sucessfully."));

});


const getCurrentUser = asyncHandler(async(req,res) => {
  return res.status(200).json(new apiResponse(200,req.user,"Current User fetched sucessfully."));
});


const updateUserAvatar = asyncHandler(async(req,res) => {
  const avatarLocalPath = req.file?.path;

  if(!avatarLocalPath) {
    throw new apiError(400,"Avatar file is Missing.");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if(!avatar.url) {
    throw new apiError(400,"Error while Uploading an Avatar.");
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {$set: {
      avatar: avatar.url
    }},
    {new: true}).select("-password");

  return res.status(200).json(new apiResponse(200,user,"Avatar updated sucessfully."));

});


const updateUserCoverImage = asyncHandler(async(req,res) => {
  const coverImageLocalPath = req.file?.path;

  if(!coverImageLocalPath) {
    throw new apiError(400,"Cover Image file is Missing.");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if(!coverImage.url) {
    throw new apiError(400,"Error while Uploading an Cover Image.");
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {$set: {
      coverImage: coverImage.url
    }},
    {new: true}).select("-password");

  return res.status(200).json(new apiResponse(200,user,"Cover Image updated sucessfully."));

});


const getUserChannelProfile = asyncHandler(async(req,res) => {        
  const {username} = req.params;

  if(!username?.trim()) {
    throw new apiError(400,"Username is Missing.");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase()
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
      $addFields: {
        subscribersCount: {
          $size: "$subscribers"
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo"
        },
        isSubscribed: {
          $cond: {
            $if: {$in: [req.user?._id,"$subscribers.subscriber"]},
            then: true,
            else: false
          }
        }
      }
    },
      {
        $project: {
          fullName: 1,
          username: 1,
          email: 1,
          avatar: 1,
          coverImage: 1,
          subscribersCount: 1,
          channelSubscribedToCount: 1,
          isSubscribed: 1

        }
      }
  ]);

  if(!channel?.length) {
    throw new apiError(400,"Channel doesn't exist.");
  }

  return res.status(200).json(new apiResponse(200,channel[0],"User channel details fetched sucessfully."));

});


export { registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateUserAvatar,updateUserCoverImage,getUserChannelProfile };