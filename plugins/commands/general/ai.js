import axios from "axios";
import { join } from "path";
import { createWriteStream } from "fs";

const config = {
    name: "ai",
    aliases: ["chat", "generate"],
    description: "Interact with GPT-4 API and generate text or images based on prompts.",
    usage: "[prompt]",
    cooldown: 3,
    permissions: [0],
    credits: "churchill"
};

const langData = {
    "en_US": {
        "missingPrompt": "Please provide a prompt to interact with the AI.",
        "error": "An error occurred while processing your request.",
    }
};

async function onCall({ message, args, getLang }) {
    if (args.length === 0) return message.reply(getLang("𝘗𝘭𝘴𝘴 𝘱𝘳𝘰𝘷𝘪𝘥𝘦 𝘢 𝘲𝘶𝘦𝘴𝘵𝘪𝘰𝘯\n\n𝘌𝘹: 𝘈𝘪 𝘸𝘩𝘢𝘵 𝘪𝘴 𝘭𝘰𝘷𝘦"));

    const prompt = args.join(" ");

    try {
        const response = await axios.get(`${global.xva_api.jonel}/api/gpt4o-v2`, {
            params: { prompt }
        });

        const { response: aiResponse } = response.data;

        if (aiResponse.startsWith("TOOL_CALL: generateImage")) {
            const imageUrlMatch = aiResponse.match(/\((https:\/\/.*?\.png.*?)\)/);
            if (imageUrlMatch && imageUrlMatch[1]) {
                const imageUrl = imageUrlMatch[1];

                const cachePath = join(global.cachePath, `generated_${Date.now()}.png`);
                const writer = createWriteStream(cachePath);
                const imageResponse = await axios.get(imageUrl, { responseType: "stream" });

                imageResponse.data.pipe(writer);

                writer.on("finish", async () => {
                    await message.reply({
                        body: "Here is the generated image:",
                        attachment: global.reader(cachePath)
                    });
                });

                writer.on("error", () => message.reply(getLang("error")));
            } else {
                message.reply(getLang("error"));
            }
        } else {
            message.reply(aiResponse);
        }
    } catch (error) {
        console.error("Error in AI command:", error);
        message.reply(getLang("error"));
    }
}

export default {
    config,
    langData,
    onCall
};
