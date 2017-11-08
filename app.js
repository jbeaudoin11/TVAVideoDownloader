import minimist from "minimist"

import { 
    round,
    downloadVideo,
    getVideoDataFromAssetId,
} from "./utils"

import axios from "axios"

// axios.get("https://videos.tva.ca/page/touslescontenus")
// .then((r) => {
//     console.log(r.headers)
//     // console.log(r.config)
// })
// // .then(r => r.data)
// // .then((html) => {
// //     console.log(html)
// // })
// .catch((err) => {
//     console.error(err)
// })

getVideoDataFromAssetId("5634980386001")
// .then((v) => {
//     console.log(v)
//     // return v;
// })
.then(downloadVideo)
.then(() => {
    console.log("DONE !!!");
})
.catch((err) => {
    console.error(err)
})