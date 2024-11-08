import axios from 'axios';
import fs from 'fs-extra';

const config = {
    name: "video",
    aliases: ["ytvideo"],
    version: "1.0",
    credits: "Churchill",
    description: "Search and download a YouTube video",
    usages: "<video-title>",
    category: "Music",
    cooldown: 5
};

async function onCall({ message, args }) {
    const { threadID, messageID } = message;
    const query = args.join(" ");

    if (!query) return message.send("❌ | Please provide a video title to search for.");

    try {
        await message.react("🔍");
        await message.send(`🎶 | Searching for **${query}**... Please wait a moment!`);

        const response = await axios.get(`https://betadash-search-download.vercel.app/videov2?search=${encodeURIComponent(query)}`);
        const { title, downloadUrl, time, views, image, channelName } = response.data;

        if (!downloadUrl) {
            return message.send("❌ | No results found. Please try another search.");
        }

        const videoInfo = `🎬 **${title}**\n📺 **Channel:** ${channelName}\n⏰ **Duration:** ${time}\n👁️ **Views:** ${views}`;
        const filePath = "./cache/video.mp4";

        const videoStream = await axios({
            url: downloadUrl,
            method: 'GET',
            responseType: 'stream'
        });
        videoStream.data.pipe(fs.createWriteStream(filePath));

        videoStream.data.on('end', async () => {
            await message.reply({
                body: videoInfo + "\n\n✅ | Video sent successfully!",
                attachment: fs.createReadStream(filePath)
            }, threadID, messageID);

            fs.unlink(filePath, (err) => {
                if (err) console.error("Error deleting file:", err);
            });
        });

        videoStream.data.on('error', (error) => {
            console.error("Error downloading video:", error);
            message.send("❌ | Failed to download the video. Please try again later.");
        });

    } catch (error) {
        console.error("Error fetching video:", error);
        await message.send("⚠️ | An error occurred while processing your request.");
    }
}

export default {
    config,
    onCall
};
