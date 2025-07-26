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


export { registerUser, loginUser,logoutUser,refreshAccessToken};