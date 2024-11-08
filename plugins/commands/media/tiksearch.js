import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import apiConfig from '../api/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cachePath = path.resolve(__dirname, '../cache');

const config = {
    name: "tiksearch",
    version: "1.0.0",
    permissions: 0,
    credits: "chill",
    description: "Search for TikTok videos based on a keyword.",
    usage: "[keyword]",
    cooldown: 3,
    category: "Videos",
};

async function onCall({ message, args, data }) {
    const prefix = data?.thread?.data?.prefix || global.config.PREFIX; // Get the prefix from thread data or global config

    if (args.length === 0) {
        return message.reply(`Please provide a keyword to search for TikTok videos.\n\nExample: ${prefix}tiksearch apt`);
    }

    const keyword = args.join(" ");
    message.reply("Searching for TikTok videos...");

    try {
        // Make a request to the TikTok API to search for videos
        const response = await axios.get(`${apiConfig.jonel}/api/tiktok/searchvideo?keywords=${encodeURIComponent(keyword)}`);

        if (response.status !== 200 || !response.data || response.data.code !== 0) {
            return message.reply("An error occurred while searching for TikTok videos.");
        }

        const videos = response.data.data.videos;

        if (videos.length === 0) {
            return message.reply("No TikTok videos found for the given keyword.");
        }

        // Select the first video from the search results
        const video = videos[0];

        // Prepare the video URL and title
        const videoUrl = video.play;
        const title = video.title;

        // Send the video as an attachment with the title in the body
        await message.reply({
            body: `Here is the TikTok video for the search keyword "${keyword}":\n\nTitle: ${title}`,
            attachment: videoUrl
        });

    } catch (error) {
        console.error("Error in tiksearch command:", error);
        message.reply("An error occurred while searching for the TikTok video.");
    }
}

export default {
    config,
    onCall
};
