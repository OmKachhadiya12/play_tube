import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: "name...",
    api_key: "key...",
    api_secret: "secret..."
});

const uploadOnCloudinary = async (localFilePath) => {
    try{
        if(!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        });

        console.log("File uploaded sucessfully!!!",response.url);
        return response;
    }catch(error){
        fs.unlinkSync(localFilePath);
        return null;
    }
}

export {uploadOnCloudinary};