import axios from "axios";
import { join } from "path";
import fs from "fs"; // Using built-in fs
import { fileURLToPath } from "url";

const config = {
    name: "music",
    aliases: ["song", "ytmusic"],
    description: "Download a YouTube audio track based on search term.",
    usage: "[search term]",
    cooldown: 5,
    permissions: [0],
    credits: "chilli"
};

const langData = {
    "en_US": {
        "missingPrompt": (prefix) => `Please provide a music title or search term.\n\nEx: ${prefix}music Apt`,
        "error": "An error occurred while processing your request.",
        "downloading": "🔍 Searching for the music, please wait...",
        "sending": "✅ Music is ready and being sent..."
    }
};

// Ensure cache directory exists
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");
const cacheFolder = join(__dirname, "cache");
if (!fs.existsSync(cacheFolder)) {
    fs.mkdirSync(cacheFolder);
}

async function onCall({ message, args, getLang, data }) {
    const prefix = data?.thread?.data?.prefix || global.config.PREFIX;

    if (args.length === 0) return message.reply(getLang("missingPrompt")(prefix));

    const query = args.join(" ");
    await message.react("🔍");  // Searching emoji reaction
    message.reply(getLang("downloading"));

    try {
        const response = await axios.get(`https://dlvc.vercel.app/yt-audio?search=${encodeURIComponent(query)}`);
        
        if (!response.data || !response.data.downloadUrl) {
            await message.react("❌");  // Error emoji reaction
            return message.reply(getLang("error"));
        }

        const { downloadUrl, title, Artist, time, views } = response.data;
        const audioPath = join(cacheFolder, `audio_${Date.now()}.mp3`);

        // Download the audio
        const writer = fs.createWriteStream(audioPath);
        const audioResponse = await axios.get(downloadUrl, { responseType: "stream" });
        audioResponse.data.pipe(writer);

        writer.on("finish", async () => {
            await message.react("✅");  // Success emoji reaction
            await message.reply({
                body: `🎶 Here is your music: ${title}\n\nArtist: ${Artist}\nDuration: ${time}\nViews: ${views}`,
                attachment: global.reader(audioPath)
            });

            // Cleanup: Remove the file after sending
            fs.unlink(audioPath, (err) => {
                if (err) console.error("Error deleting file:", err);
                else console.log("File deleted successfully.");
            });
        });

        writer.on("error", async () => {
            await message.react("❌");  // Error emoji reaction
            message.reply(getLang("error"));
        });

    } catch (error) {
        console.error("Error in music command:", error);
        await message.react("❌");  // Error emoji reaction
        message.reply(getLang("error"));
    }
}

export default {
    config,
    langData,
    onCall
};
