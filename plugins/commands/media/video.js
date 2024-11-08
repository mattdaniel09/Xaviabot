import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cachePath = path.resolve(__dirname, '../cache');

const config = {
    name: "video",
    description: "Search and download a video based on a keyword.",
    usage: "video <keyword>\nExample: video apt",
    author: "chilli",
};

async function onCall({ kupal, mansi }) {
    if (!mansi || mansi.length === 0) {
        return kupal.reply('Please provide a keyword to search for a video.\n\nExample: video apt');
    }

    const chilli = mansi.join(' ');
    kupal.reply(`Searching for video: "${chilli}"... Please wait.`);

    try {
        const apiUrl = `https://betadash-search-download.vercel.app/videov2?search=${encodeURIComponent(chilli)}`;
        const response = await axios.get(apiUrl);
        const { title, downloadUrl, time, views, channelName } = response.data;

        if (!downloadUrl) {
            return kupal.reply(`No video found for the keyword "${chilli}". Please try another keyword.`);
        }

        const videoDetails = `**Video Found!**\n\nTitle: ${title}\nChannel: ${channelName}\nViews: ${views}\nDuration: ${time}`;
        kupal.reply(videoDetails);

        await fs.ensureDir(cachePath);
        const videoPath = path.join(cachePath, `video_${Date.now()}.mp4`);

        const videoResponse = await axios.get(downloadUrl, { responseType: 'stream' });
        await new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(videoPath);
            videoResponse.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        await kupal.reply({
            attachment: fs.createReadStream(videoPath),
            body: `Here is the video based on your search "${chilli}":\n\nTitle: ${title}\nChannel: ${channelName}\nViews: ${views}\nDuration: ${time}`
        });

        fs.remove(videoPath);
    } catch (error) {
        console.error("Error in video command:", error);
        kupal.reply("An error occurred while searching for the video. Please try again.");
    }
}

export default {
    config,
    onCall
};
