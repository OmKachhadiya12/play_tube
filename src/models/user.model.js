import mongoose, { Schema } from "mongoose";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullname: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avtar: {
        type: String,
        required: true
    },
    coverImage: {
        type: String
    },
    watchHistory:[ 
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    password: {
        type: String,
        required: [true,"Password is required"]
    },
    refreshToken: {
        type: String
    }
},{timestamps: true});

const User = mongoose.model("User",userSchema);

export default User;