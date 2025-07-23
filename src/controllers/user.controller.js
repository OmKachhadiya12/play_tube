import { asyncHandler } from "./../utils/asyncHandler.js";
import { apiError } from "./../utils/apiError.js";
import User from "./../models/user.model.js";
import {uploadOnCloudinary} from "./../utils/cloudinary.js";
import {apiResponse} from "./../utils/apiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body;
    
  if ([fullName, email, username, password].some((feild) => {feild?.trim() == "";})) {
    throw new apiError(400, "All fields are Required.");
}

const existedUser = User.findOne({
    $or: [{ username }, { email }],
});

  if (existedUser) {
      throw new apiError(409, "User already exist.");
    }
    
    const avatarLocalPath = req.files?.avatar[0].path;
    const coverImageLocalPath = req.files?.coverImage.path;

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

  const createdUser = User.findById(user._id).select("-password -refreshToken");

  if(!createdUser) {
    throw new apiError(500,"Something went wrong.");
  }

  return res.status(200).json(
    new apiResponse(200,createdUser,"User created sucessfully.")
  )

});

export { registerUser };
