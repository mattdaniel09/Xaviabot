import axios from "axios";
import { join } from "path";
import fs from "fs-extra";
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
        "sending": "🎶 Music is ready and being sent..."
    }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");
const cacheFolder = join(__dirname, "cache");
fs.ensureDirSync(cacheFolder);

async function onCall({ message, args, getLang, data }) {
    const prefix = data?.thread?.data?.prefix || global.config.PREFIX;

    if (args.length === 0) return message.reply(getLang("missingPrompt")(prefix));

    const query = args.join(" ");

    try {
        const response = await axios.get(`https://dlvc.vercel.app/yt-audio?search=${encodeURIComponent(query)}`);
        
        if (!response.data || !response.data.downloadUrl) {
            await message.react("❌");
            return message.reply(getLang("error"));
        }

        const { downloadUrl, title, Artist, time, views, thumbnail } = response.data;
        const audioPath = join(cacheFolder, `audio_${Date.now()}.mp3`);

        const writer = fs.createWriteStream(audioPath);
        const audioResponse = await axios.get(downloadUrl, { responseType: "stream" });
        audioResponse.data.pipe(writer);

        writer.on("finish", async () => {
            await message.react("🎧");
            await message.reply({
                body: `🎵 Here is your music: ${title}\n\nArtist: ${Artist}\nDuration: ${time}\nViews: ${views}`,
                attachment: global.reader(audioPath)
            });
            fs.unlink(audioPath, (err) => {
                if (err) console.error("Error deleting file:", err);
                else console.log("File deleted successfully.");
            });
        });

        writer.on("error", async () => {
            await message.react("❌");
            message.reply(getLang("error"));
        });

    } catch (error) {
        console.error("Error in music command:", error);
        await message.react("❌");
        message.reply(getLang("error"));
    }
}

export default {
    config,
    langData,
    onCall
};
