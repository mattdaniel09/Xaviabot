import axios from "axios";
import { join } from "path";
import { createWriteStream } from "fs";
import apiConfig from '../api/api.js';

const config = {
    name: "ai",
    aliases: ["chat", "generate"],
    description: "Interact with GPT-4 API to generate text or images based on prompts.",
    usage: "[prompt]",
    cooldown: 3,
    permissions: [0],
    credits: "chilli"
};

const langData = {
    "en_US": {
        "missingPrompt": (prefix) => `Please provide a question or prompt for the AI.\n\nEx: ${prefix}ai what is love`,
        "error": "An error occurred while processing your request.",
    }
};

async function onCall({ message, args, getLang, data }) {
    const prefix = data?.thread?.data?.prefix || global.config.PREFIX;

    if (args.length === 0) return message.reply(getLang("missingPrompt")(prefix));

    const prompt = args.join(" ");
    await message.react("🔍");

    try {
        const response = await axios.get(`${apiConfig.jonel}/api/gpt4o-v2?prompt=${encodeURIComponent(prompt)}`);

        if (!response.data || !response.data.response) {
            await message.react("❌");
            return message.reply(getLang("error"));
        }

        const aiResponse = response.data.response;

        if (aiResponse.startsWith("TOOL_CALL: generateImage")) {
            const imageUrlMatch = aiResponse.match(/\((https:\/\/.*?\.png.*?)\)/);

            if (imageUrlMatch && imageUrlMatch[1]) {
                const imageUrl = imageUrlMatch[1];
                const cachePath = join(global.cachePath, `generated_${Date.now()}.png`);
                const writer = createWriteStream(cachePath);

                const imageResponse = await axios.get(imageUrl, { responseType: "stream" });
                imageResponse.data.pipe(writer);

                writer.on("finish", async () => {
                    await message.react("✅");
                    await message.reply({
                        body: "Here is the generated image:",
                        attachment: global.reader(cachePath)
                    });
                });

                writer.on("error", async () => {
                    await message.react("❌");
                    message.reply(getLang("error"));
                });
            }
        } else {
            const userInfo = await global.controllers.Users.getInfo(message.senderID);
            const senderName = userInfo?.name || "User";

            await message.react("✅");
            await message.reply({
                body: aiResponse + `\n\n👤 𝘈𝘴𝘬𝘦𝘥 𝘣𝘺: ${senderName}`,
                mentions: [{ tag: senderName, id: message.senderID }]
            });
        }
    } catch (error) {
        console.error("Error in AI command:", error);
        await message.react("❌");
        message.reply(getLang("error"));
    }
}

export default {
    config,
    langData,
    onCall
};
