import axios from "axios";
import fs from "fs-extra"; // Import fs-extra for extended functionalities
import { join, dirname } from "path";
import { fileURLToPath } from 'url';
import { fetchFromEndpoint } from "../../api.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cachePath = join(__dirname, './plugins/commands/cache');

const config = {
    name: "flux",
    aliases: ["imagegen", "img"],
    description: "Generate an image based on the prompt provided.",
    usage: "[prompt]",
    cooldown: 5,
    permissions: [0],
    credits: "chill"
};

const langData = {
    "en_US": {
        "missingPrompt": (prefix) => `Please provide a prompt for the image generation.\n\nEx: ${prefix}flux cat`,
        "answering": "Generating the image...",
        "error": "An error occurred while generating the image.",
    }
};

async function onCall({ message, args, getLang, data }) {
    const prefix = data?.thread?.data?.prefix || global.config.PREFIX;

    if (args.length === 0) return message.reply(getLang("missingPrompt")(prefix));

    const prompt = args.join(" ");
    message.reply(getLang("answering"));

    try {
        const response = await fetchFromEndpoint("jonel", "/api/flux", { prompt });

        if (!response || !response.response) return message.reply(getLang("error"));

        const imageUrl = response.response;
        const imagePath = join(cachePath, `generated_flux_${Date.now()}.png`);

        // Ensure cache directory exists
        await fs.ensureDir(cachePath);

        const imageResponse = await axios.get(imageUrl, { responseType: "stream" });
        const writer = fs.createWriteStream(imagePath); // Use fs-extra's method

        imageResponse.data.pipe(writer);

        writer.on("finish", async () => {
            await message.reply({
                body: "Here is the generated image:",
                attachment: global.reader(imagePath)
            });
            // Clean up the file after sending
            await fs.unlink(imagePath);
        });

        writer.on("error", () => {
            message.reply(getLang("error"));
        });
    } catch (error) {
        console.error("Error in flux command:", error);
        message.reply(getLang("error"));
    }
}

export default {
    config,
    langData,
    onCall
};
