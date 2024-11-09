import axios from 'axios';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const config = {
    name: "music",
    aliases: ["playmusic", "ytmusic"],
    version: "1.0",
    credits: "chill",
    description: "Play a song from YouTube",
    usages: "<song-name>",
    category: "Music",
    cooldown: 5
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cacheFolder = __dirname + '/cache';

async function ensureCacheFolderExists() {
    try {
        await fs.ensureDir(cacheFolder);
    } catch (error) {
        console.error('Error creating cache folder:', error);
    }
}

async function onCall({ message, args }) {
    const { messageID, threadID } = message;
    const songQuery = args.join(" ");

    if (!songQuery) {
        return message.send("Please provide a song name to search.");
    }

    try {
        await ensureCacheFolderExists();

        await message.react("⌛");

        const response = await axios.get(`https://dlvc.vercel.app/yt-audio?search=${encodeURIComponent(songQuery)}`);
        const { title, downloadUrl, time, views, Artist, Album, thumbnail, channelName } = response.data;

        const filePath = await downloadTrack(downloadUrl);

        await message.reply({
            body: `🎶 Now Playing: ${title}\n🎤 Artist: ${Artist}\n📀 Album: ${Album}\n⏱ Duration: ${time}\n👁 Views: ${views}\n📺 Channel: ${channelName}`,
            attachment: fs.createReadStream(filePath),
            thumbnail: thumbnail
        });

        fs.unlink(filePath, (err) => {
            if (err) console.error("Error deleting file:", err);
            else console.log("File deleted successfully.");
        });

    } catch (error) {
        console.error("Error occurred:", error);
        await message.send(`An error occurred: ${error.message}`);
    }
}

async function downloadTrack(url) {
    const response = await axios.get(url, { responseType: 'stream' });
    const filePath = `${cacheFolder}/${randomString()}.mp3`;

    const writeStream = fs.createWriteStream(filePath);
    response.data.pipe(writeStream);

    return new Promise((resolve, reject) => {
        writeStream.on('finish', () => resolve(filePath));
        writeStream.on('error', reject);
    });
}

function randomString(length = 10) {
    return Math.random().toString(36).substring(2, 2 + length);
}

export default {
    config,
    onCall
};
