import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// Define directory paths
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cachePath = './plugins/commands/cache';

// Command configuration
const config = {
    name: "flux",
    version: "1.0.0",
    permissions: 0,
    credits: "chilli",
    description: "Generate an image with a prompt using Jonel's API",
    usage: "[prompt]",
    cooldown: 3,
    category: "Images",
};

// Main command function
async function onCall({ message, args }) {
    // Check if there are arguments
    if (args.length === 0) {
        return message.reply("Please provide a prompt for the image generation.\n\nExample: flux cat");
    }

    // Combine args to form the prompt
    const prompt = args.join(" ");
    message.reply("Generating image...");

    try {
        // Import configuration dynamically
        const configMain = await import('../../../config/config.main.json', {
            assert: { type: "json" }
        });

        // Use the Jonel API endpoint from config
        const response = await axios.get(`${configMain.global.jonel.ENDPOINT}/api/flux?prompt=${encodeURIComponent(prompt)}`, {
            responseType: 'arraybuffer'
        });

        // Check if the request was successful
        if (response.status !== 200) {
            return message.reply("An error occurred while generating the image.");
        }

        const imgBuffer = Buffer.from(response.data, 'binary');

        // Ensure the cache directory exists
        await fs.ensureDir(cachePath);

        // Save the generated image to the cache directory
        const filePath = path.join(cachePath, `flux_${Date.now()}.png`);
        await fs.outputFile(filePath, imgBuffer);

        // Send the generated image as a reply
        await message.reply({
            body: "Here is your generated image:",
            attachment: fs.createReadStream(filePath)
        });
    } catch (error) {
        console.error("Error in flux command:", error);
        message.reply("An error occurred while generating the image.");
    }
}

// Export the command configuration and function
export default {
    config,
    onCall
};
