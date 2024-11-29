import axios from "axios";
import { createWriteStream } from "fs";
import { join } from "path";

const config = {
    name: "video",
    description: "Search and download a video by providing a query.",
    usage: "[query]",
    cooldown: 3,
    category: "Media",
    credits: "chilli"
};

async function onCall({ message, args }) {
    if (args.length === 0) {
        return message.reply("❗ Please provide a search query for the video.\n\nExample: video apt");
    }

    const query = args.join(" ");
    await message.react("🔍"); // React to indicate search started

    try {
        const response = await axios.get(`https://betadash-search-download.vercel.app/videov2?search=${encodeURIComponent(query)}`);

        if (!response.data || !response.data.downloadUrl) {
            await message.react("❌");
            return message.reply("⚠️ No video found or an error occurred while fetching the video details.");
        }

        const { title, downloadUrl, time, views, image, channelName } = response.data;

        // Download video to local cache for sending
        const videoPath = join(global.cachePath || "./cache", `video_${Date.now()}.mp4`);
        const writer = createWriteStream(videoPath);

        const videoResponse = await axios.get(downloadUrl, { responseType: "stream" });
        videoResponse.data.pipe(writer);

        writer.on("finish", async () => {
            await message.react("✅"); // React to indicate success
            await message.reply({
                body: `🎥 **Title:** ${title}\n⏱ **Duration:** ${time}\n👁 **Views:** ${views}\n📺 **Channel:** ${channelName}\n\nHere is your video:`,
                attachment: global.reader(videoPath)
            });
        });

        writer.on("error", async () => {
            await message.react("❌");
            message.reply("❗ An error occurred while downloading the video.");
        });
    } catch (error) {
        console.error("Error in video command:", error);
        await message.react("❌");
        message.reply("⚠️ An error occurred while processing your request.");
    }
}

export default {
    config,
    onCall
};
