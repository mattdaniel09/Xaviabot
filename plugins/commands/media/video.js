import axios from "axios";
import { join } from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";

const config = {
    name: "video",
    aliases: ["vid", "ytvideo"],
    description: "Download a YouTube video based on search term.",
    usage: "[search term]",
    cooldown: 5,
    permissions: [0],
    credits: "chilli"
};

const langData = {
    "en_US": {
        "missingPrompt": (prefix) => `Please provide a video title or search term.\n\nEx: ${prefix}video Bruno Mars`,
        "error": "An error occurred while processing your request.",
        "downloading": "🔍 Searching for the video, please wait...",
        "sending": "✅ Video is ready and being sent..."
    }
};

// Ensure cache directory exists
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");
const cacheFolder = join(__dirname, "cache");
fs.ensureDirSync(cacheFolder);

async function onCall({ message, args, getLang, data }) {
    const prefix = data?.thread?.data?.prefix || global.config.PREFIX;

    if (args.length === 0) return message.reply(getLang("missingPrompt")(prefix));

    const query = args.join(" ");
    await message.react("🔍");  // Searching emoji reaction
    message.reply(getLang("downloading"));

    try {
        const response = await axios.get(`https://betadash-search-download.vercel.app/videov2?search=${encodeURIComponent(query)}`);
        
        if (!response.data || !response.data.downloadUrl) {
            await message.react("❌");  // Error emoji reaction
            return message.reply(getLang("error"));
        }

        const { downloadUrl, title } = response.data;
        const videoPath = join(cacheFolder, `video_${Date.now()}.mp4`);

        // Download the video
        const writer = fs.createWriteStream(videoPath);
        const videoResponse = await axios.get(downloadUrl, { responseType: "stream" });
        videoResponse.data.pipe(writer);

        writer.on("finish", async () => {
            await message.react("✅");  // Success emoji reaction
            await message.reply({
                body: `🎬 Here is your video: ${title}`,
                attachment: global.reader(videoPath)
            });
            fs.unlink(videoPath, (err) => {
                if (err) console.error("Error deleting file:", err);
                else console.log("File deleted successfully.");
            });
        });

        writer.on("error", async () => {
            await message.react("❌");  // Error emoji reaction
            message.reply(getLang("error"));
        });

    } catch (error) {
        console.error("Error in video command:", error);
        await message.react("❌");  // Error emoji reaction
        message.reply(getLang("error"));
    }
}

export default {
    config,
    langData,
    onCall
};
