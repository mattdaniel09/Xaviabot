import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import apiConfig from '../api/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cachePath = path.resolve(__dirname, '../cache');

const config = {
    name: "flux",
    version: "1.0.0",
    permissions: 0,
    credits: "chill",
    description: "Generate an image with a prompt using Jonel's API",
    usage: "[prompt]",
    cooldown: 3,
    category: "Images",
};

async function onCall({ message, args }) {
    if (args.length === 0) {
        return message.reply("Please provide a prompt for the image generation.\n\nExample: flux cat");
    }

    const prompt = args.join(" ");
    message.reply("Generating image...");

    try {
        const response = await axios.get(`${apiConfig.flux}/api/flux?prompt=${encodeURIComponent(prompt)}`, {
            responseType: 'arraybuffer'
        });

        if (response.status !== 200) {
            return message.reply("An error occurred while generating the image.");
        }

        const imgBuffer = Buffer.from(response.data, 'binary');
        await fs.ensureDir(cachePath);
        const filePath = path.join(cachePath, `flux_${Date.now()}.png`);
        await fs.outputFile(filePath, imgBuffer);

        await message.reply({
            body: "Here is your generated image:",
            attachment: fs.createReadStream(filePath)
        });
    } catch (error) {
        console.error("Error in flux command:", error);
        message.reply("An error occurred while generating the image.");
    }
}

export default {
    config,
    onCall
};
