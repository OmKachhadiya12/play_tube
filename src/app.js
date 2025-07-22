import express from "express";
const app = express();

import cookieParser from "cookie-parser";
import cors from "cors";

app.use(cors({
    origin: process.env.CORS_ORIGIN
}));

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(cookieParser());

import userRouter from "./routes/user.routes.js";

export {app};