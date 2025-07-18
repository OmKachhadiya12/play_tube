require('dotenv').config({path: './env'});

import connectDB from "./db/index.js";
import {app} from "./app.js";

connectDB()
.then( () => {
    app.listen(process.env.PORT || 3000,() => {
        console.log('Server is Running!!!');
    });
})
.catch( (err) => {
    console.log('Error',err);
});  