import axios from "axios";
import { join } from "path";
import { createWriteStream } from "fs";

const config = {
    name: "ai",
    aliases: ["chat", "generate"],
    description: "Interact with GPT-4 API to generate text or images based on prompts.",
    usage: "[prompt]",
    cooldown: 3,
    permissions: [0],
    credits: "churchill"
};

const langData = {
    "en_US": {
        "missingPrompt": "Please provide a question or prompt for the AI.",
        "error": "An error occurred while processing your request.",
    }
};

async function onCall({ message, args, getLang }) {
    if (args.length === 0) return message.send(getLang("missingPrompt"));

    const prompt = args.join(" ");

    try {
        // Directly use the specified endpoint without relying on global variables
        const response = await axios.get("https://ccprojectapis.ddns.net/api/gpt4o-v2", {
            params: { prompt }
        });

        if (!response || !response.data || !response.data.response) return message.send(getLang("error"));

        const aiResponse = response.data.response;

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
                    await message.send({
                        body: "Here is the generated image:",
                        attachment: global.reader(cachePath)
                    });
                });

                writer.on("error", () => {
                    message.send(getLang("error"));
                });
            }
        } else {
            // Handle text response
            message.send(aiResponse);
        }
    } catch (error) {
        console.error("Error in AI command:", error);
        message.send(getLang("error"));
    }
}

export default {
    config,
    langData,
    onCall
};
