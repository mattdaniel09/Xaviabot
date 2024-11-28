import axios from "axios";
import apiConfig from '../api/api.js';

const config = {
    name: "ai",
    aliases: ["chat"],
    description: "Interact with GPT-4 API to generate text responses based on prompts.",
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
        const response = await axios.get(`${apiConfig.kenlie}/blackbox-gpt4o/?text=${encodeURIComponent(prompt)}`);

        if (!response.data || !response.data.response) {
            await message.react("❌");
            return message.reply(getLang("error"));
        }

        const aiResponse = response.data.response;

        const userInfo = await global.controllers.Users.getInfo(message.senderID);
        const senderName = userInfo?.name || "User";

        await message.react("✅");
        await message.reply({
            body: aiResponse + `\n\n👤 𝘈𝘴𝘬𝘦𝘥 𝘣𝘺: ${senderName}`,
            mentions: [{ tag: senderName, id: message.senderID }]
        });
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
