import axios from 'axios';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const config = {
    name: "music",
    aliases: ["playmusic", "ytmusic"],
    version: "1.0",
    credits: "chilli",
    description: "Play a song with lyrics from YouTube",
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

        const lyricsResponse = await axios.get(`https://markdevs-last-api-vtjp.onrender.com/search/lyrics?q=${encodeURIComponent(songQuery)}`);
        const lyrics = lyricsResponse.data.result.lyrics;
        const title = lyricsResponse.data.result.title;
        const artist = lyricsResponse.data.result.artist;

        await message.send(`🎶 Lyrics for "${title}" by ${artist}:\n\n${lyrics}`);

        const musicResponse = await axios.get(`https://dlvc.vercel.app/yt-audio?search=${encodeURIComponent(songQuery)}`);
        const { title: songTitle, downloadUrl, time, views, Artist, Album, channelName } = musicResponse.data;

        const filePath = await downloadTrack(downloadUrl);
        await message.react("🎧");

        await message.reply({
            body: `🎶 Now Playing: ${songTitle}\n🎤 Artist: ${Artist}\n📀 Album: ${Album}\n⏱ Duration: ${time}\n👁 Views: ${views}\n📺 Channel: ${channelName}`,
            attachment: fs.createReadStream(filePath)
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
    const encodedUrl = encodeURI(url);
    const response = await axios.get(encodedUrl, { responseType: 'stream' });
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
