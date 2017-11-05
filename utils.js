import request from "request"
import requestProgress from "request-progress"
import fs from "fs"

import { JSDOM } from "jsdom"
import axios from "axios"
import _ from "lodash"

export const round = (nb, p=0) => {
    const val = Math.pow(10, p);
    return Math.round(nb * val) / val;
}

export const getPageInitalState = (url) => {
    return axios.get(url)
    .then(r => r.data)
    .then((html) => {

        // Parse the html
        const dom = new JSDOM(html, {
            runScripts: "dangerously",
        });

        if(dom.window.__INITIAL_STATE__ == undefined) {
            throw new Error("Wasn't able to find the initial state")
        }

        return dom.window.__INITIAL_STATE__;
    })
}

export const getAccountId = (url) => {
    return getPageInitalState(url).then((state) => state.configurations.accountId)
}

const _getAllContentData = () => {
    return getPageInitalState("https://videos.tva.ca/page/touslescontenus")
    .then((state) => {
        /*
            Item -> a serie
            Container -> list of series by alphabets
        */
    
        // Parse items
        const items = {};
        Object.keys(state.items).forEach((itemId) => {
            const { content } = state.items[itemId];
            const {
                title,
                description,
                entry,
                ["image-background"]:imageUrl,
            } = content.attributes;
            
            items[itemId] = {
                id: itemId,
                title,
                description,
                entry,
                imageUrl,
            }
        })

        // Get containers ids ordered
        const containerIds = state.pages.touslescontenus.content.containerId;
    
        // Parse containers
        const containersById = {};
        Object.keys(state.containers).forEach((containerId) => {
            const { content } = state.containers[containerId];
    
            containersById[containerId] = {
                id: containerId,
                title: content.title,
                items: content.itemId.map((itemId) => items[itemId]),
            }
        })
    
        // Create ordered array of content
        const containers = [];
        containerIds.forEach((id) => {
            if(containersById[id]) {
                containers.push(containersById[id])
            }
        })

        return containers;
    })
}

const _getEntryContentData = (entryId, entry) => {
    // console.log(alias)

    return getPageInitalState(`https://videos.tva.ca/page/${entry}`)
    .then((state) => {
        /*
            Item -> a video
            Container -> list of series by context ()
        */
    
        // Parse items
        const items = {};
        Object.keys(state.items).forEach((itemId) => {
            const { content } = state.items[itemId];

            if(content.typeId === "go-item-video") {
                const {
                    title,
                    assetId,
                    availableDate,
                    ["image-background"]:imageUrl,
                } = content.attributes;

                items[itemId] = {
                    id: itemId,
                    assetId,
                    title,
                    availableDate,
                    imageUrl,
                }
            }
        })

        
        /* Get the container "À voir et à revoir"
            it's the one with new episodes
        */
        const container = _.find(state.containers, (c) => c.content.title && c.content.title.indexOf("À voir et à revoir") !== -1);
        if(!container || (container && !container.content.itemId)) { // If the container doesn't exist just return null
            return null;
        }

        return {
            id: entryId,
            items: container.content.itemId.map((itemId) => items[itemId]),
        }
    })
}

export const getVideoDataFromAssetId = (assetId) => {
    const accountId = "5481942443001"; // Doesn't change ?

    return axios.get(`https://edge.api.brightcove.com/playback/v1/accounts/${accountId}/videos/${assetId}`, {
        headers: {
            // I assume the pk doesn't change..
            Accept: "application/json;pk=BCpkADawqM1zLKxHdKoN3lG3X3NsHHYLqL1XHWyE6FQQoW5-2ph1BKHgKA1DnuOXatmvtaEt27nSg2lxdf29u4jtaAsLe9KZ4Lnj6trbJxRq4aRtfNehcqeWb8gcU5IpDoHy3RLXbLQo4HAA"
        }
    })
    .then(r => r.data)
    .then((data) => {
        
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
}

export const downloadVideo = (data, resolution="1920x1080", output_name) => {
    return new Promise((res, rej) => {
        requestProgress(request(data.sources[resolution]))
        .on("progress", (state) => {
            console.log(`${round(state.percent*100)}% -- ${round(state.time.elapsed, 1)}s -- ${round(state.time.remaining, 1)}s -- ${round(state.speed / 1000 / 1000, 2)} MB/s`);
        })
        .on("err", rej)
        .on("end", res)
        .pipe(fs.createWriteStream(`outputs/${output_name || data.title}.mp4`))
    })
}