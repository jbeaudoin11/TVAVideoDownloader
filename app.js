import minimist from "minimist"

import { 
    round,
    downloadVideo,
    getVideoDataFromAssetId,
} from "./utils"

// const video_url = "https://videos.tva.ca/details/_5579749041001"

const {
    _:params,
    o:output_filename,
    // r:suggested_resolution,
} = minimist(process.argv.slice(2));
const video_url = "" + params[0];

const videoId = video_url.split("_").pop(); // Take the last part of the url

getVideoDataFromAssetId("5632416053001")
.then(downloadVideo)
.then(() => {
    console.log("DONE !!!");
})
.catch((err) => {
    console.error(err)
})