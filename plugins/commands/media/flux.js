import { join } from "path";
import { createWriteStream } from "fs";
import { fetchFromEndpoint } from "../../api.js";  // Import from api.js

const config = {
    name: "flux",
    aliases: ["imagegen", "fluxgen"],
    description: "Generate an image using Jonel's API with a given prompt.",
    usage: "[prompt]",
    cooldown: 3,
    permissions: [0],
    credits: "chilli"
};

const langData = {
    "en_US": {
        "missingPrompt": (prefix) => `Please provide a prompt for the image generator.\n\nEx: ${prefix}flux cat`,
        "generating": "Generating image...",
        "error": "An error occurred while generating the image.",
    }
};

async function onCall({ message, args, getLang, data }) {
    const prefix = data?.thread?.data?.prefix || global.config.PREFIX;

    if (args.length === 0) return message.send(getLang("missingPrompt")(prefix)); // Show example prompt if missing

    const prompt = args.join(" ");
    message.send(getLang("generating"));

    try {
        const response = await fetchFromEndpoint("jonel", "/api/flux", { prompt });

        if (!response || !response.url) {
            return message.send(getLang("error"));
        }

        const imageUrl = response.url;
        const cachePath = join(global.cachePath, `flux_${Date.now()}.png`);
        const writer = createWriteStream(cachePath);

        const imageResponse = await axios.get(imageUrl, { responseType: "stream" });
        imageResponse.data.pipe(writer);

        writer.on("finish", async () => {
            await message.send({
                body: "Here is your generated image:",
                attachment: global.reader(cachePath)
            });
        });

        writer.on("error", () => {
            message.send(getLang("error"));
        });
    } catch (error) {
        console.error("Error in flux command:", error);
        message.send(getLang("error"));
    }
}

export default {
    config,
    langData,
    onCall
};
