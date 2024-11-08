import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cachePath = path.resolve(__dirname, '../cache');

const config = {
    name: "video",
    version: "1.0.0",
    permissions: 0,
    credits: "chill",
    description: "Search and download a video based on a keyword.",
    usage: "video <keyword>\nExample: video funny cat",
    cooldown: 3,
    category: "Media",
};

async function onCall({ kupal, mansi }) {
    if (mansi.length === 0) {
        return kupal.sendMessage(
            `Please provide a keyword to search for a video.\n\nExample: video funny cat`,
            kupal.threadID,
            kupal.messageID
        );
    }

    const keyword = mansi.join(' ');
    kupal.sendMessage(`Searching for video: "${keyword}"... Please wait.`, kupal.threadID, kupal.messageID);

    try {
        const apiUrl = `https://betadash-search-download.vercel.app/videov2?search=${encodeURIComponent(keyword)}`;
        const response = await axios.get(apiUrl);
        const { title, downloadUrl, time, views, channelName } = response.data;

        if (!downloadUrl) {
            return kupal.sendMessage(
                `No video found for the keyword "${keyword}". Please try another keyword.`,
                kupal.threadID,
                kupal.messageID
            );
        }

        const videoDetails = `**Video Found!**\n\nTitle: ${title}\nChannel: ${channelName}\nViews: ${views}\nDuration: ${time}`;
        kupal.sendMessage(videoDetails, kupal.threadID, kupal.messageID);

        // Ensure the cache directory exists
        await fs.ensureDir(cachePath);
        const videoPath = path.join(cachePath, `video_${Date.now()}.mp4`);

        // Download the video
        const videoResponse = await axios.get(downloadUrl, { responseType: 'stream' });
        await new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(videoPath);
            videoResponse.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        // Send the video as an attachment
        await kupal.sendMessage(
            {
                body: `Here is your requested video: ${title}\nChannel: ${channelName}\nDuration: ${time}`,
                attachment: fs.createReadStream(videoPath)
            },
            kupal.threadID,
            kupal.messageID
        );

        // Clean up the cache by removing the downloaded video
        await fs.remove(videoPath);

    } catch (error) {
        console.error("Error in video command:", error);
        kupal.sendMessage(
            "An error occurred while searching for the video. Please try again.",
            kupal.threadID,
            kupal.messageID
        );
    }
}

export default {
    config,
    onCall
};
