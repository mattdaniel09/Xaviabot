import { join } from "path";
import { createWriteStream } from "fs";
import { fetchFromEndpoint } from "../../api.js";  // Import from api.js
import axios from "axios"; // Import axios if needed

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
        "answering": "AI is typing...",
        "error": "An error occurred while processing your request.",
    }
};

async function onCall({ message, args, getLang, data }) {
    const prefix = data?.thread?.data?.prefix || global.config.PREFIX;

    if (args.length === 0) return message.send(getLang("missingPrompt", prefix));

    const prompt = args.join(" ");
    const answeringMessage = await message.send(getLang("answering")); // Send answering indicator

    try {
        // Use fetchFromEndpoint to get data from Jonel's endpoint
        const response = await fetchFromEndpoint("jonel", "/api/gpt4o-v2", { prompt });

        if (!response || !response.response) return message.send(getLang("error"));

        const aiResponse = response.response;

        // Handle image response
        if (aiResponse.startsWith("TOOL_CALL: generateImage")) {
            const imageUrlMatch = aiResponse.match(/\((https:\/\/.*?\.png.*?)\)/);

            if (imageUrlMatch && imageUrlMatch[1]) {
                const imageUrl = imageUrlMatch[1];
                const cachePath = join(global.cachePath, `generated_${Date.now()}.png`);
                const writer = createWriteStream(cachePath);

                const imageResponse = await axios.get(imageUrl, { responseType: "stream" });
                imageResponse.data.pipe(writer);

                writer.on("finish", async () => {
                    await answeringMessage.delete(); // Remove answering indicator
                    await message.send({
                        body: "Here is the generated image:",
                        attachment: global.reader(cachePath)
                    });
                });

                writer.on("error", () => {
                    answeringMessage.delete(); // Remove answering indicator
                    message.send(getLang("error"));
                });
            }
        } else {
            // Handle text response
            answeringMessage.delete(); // Remove answering indicator
            message.send(aiResponse);
        }
    } catch (error) {
        answeringMessage.delete(); // Remove answering indicator
        console.error("Error in AI command:", error);
        message.send(getLang("error"));
    }
}

export default {
    config,
    langData,
    onCall
};
