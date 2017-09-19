import request from "request"
import requestP from "request-promise"
import requestProgress from "request-progress"
import { JSDOM } from "jsdom"
import fs from "fs"
import minimist from "minimist"

// const video_url = "https://videos.tva.ca/details/_5579749041001"

const {
    _:params,
    o:output_filename,
    // r:suggested_resolution,
} = minimist(process.argv.slice(2));
const video_url = params[0];

const accountId = "5481942443001"; // Doesn't change ?
const videoId = video_url.split("_").pop();

// TODO If accountId does change, use this code
// request.get({
//     uri: video_url,
// })
// .then((html) => {
    
//     // Parse the html and find accountId and videoId
//     const dom = new JSDOM(html, {
//         runScripts: "dangerously",
//     });

//     if(dom.window.__INITIAL_STATE__ == undefined) {
//         throw new Error("Wasn't able to find the video")
//     }
//     const state = dom.window.__INITIAL_STATE__;

//     try {
//         const accountId = state.configurations.accountId

//         //...

//     } catch(e) {
//         throw new Error("Wasn't able to find the video")
//     }
// })

function round(nb, p=0) {
    const val = Math.pow(10, p);
    return Math.round(nb * val) / val;
}

requestP.get({
    uri: `https://edge.api.brightcove.com/playback/v1/accounts/${accountId}/videos/${videoId}`,
    headers: {
        // For now i assume the pk doesn't change..
        Accept: "application/json;pk=BCpkADawqM1zLKxHdKoN3lG3X3NsHHYLqL1XHWyE6FQQoW5-2ph1BKHgKA1DnuOXatmvtaEt27nSg2lxdf29u4jtaAsLe9KZ4Lnj6trbJxRq4aRtfNehcqeWb8gcU5IpDoHy3RLXbLQo4HAA"
    }
})
.then((content) => {
    const data = JSON.parse(content);
    
    // Search for video files
    const sources = {};
    data.sources.forEach((s) => {
        
        if(s.container == "MP4") {
            sources[`${s.width}x${s.height}`] = s.src;
        }

    })

    // Video
    return {
        sources,
        thumbnail: data.thumbnail_sources[0].src,
        title: data.name,
    }
})
.then((video) => {
    
    return new Promise((res, rej) => {
        // Download 1920x1080
        requestProgress(request(video.sources["1920x1080"]))
        .on("progress", (state) => {
            console.log(`${round(state.percent*100)}% -- ${round(state.time.elapsed, 1)}s -- ${round(state.time.remaining, 1)}s -- ${round(state.speed / 1000 / 1000, 2)} MB/s`);
        })
        .on("err", rej)
        .on("end", res)
        .pipe(fs.createWriteStream(`outputs/${output_filename || video.title}.mp4`))
    })

})
.then(() => {
    console.log("DONE !!!");
})
.catch((err) => {
    console.log(err.stack);
    // console.log(err.message);
})