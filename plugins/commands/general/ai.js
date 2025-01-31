import axios from "axios";
import { createWriteStream } from "fs";
import { join } from "path";

const config = {
    name: "ai",
    aliases: ["bot"],
    description: "Talk with AI or generate images",
    usage: "[question] or imagine [prompt]",
    cooldown: 5,
    permissions: [0],
    credits: "Your Name"
};

const langData = {
    "en_US": {
        "invalidInput": (prefix) => `Please provide a question or use 'imagine' for image generation.\n\nExamples:\n${prefix}ai what is love\n${prefix}ai imagine beautiful sunset`,
        "processingError": "An error occurred. Please try again.",
        "imageGenerated": "🎨 Here's your generated image:",
        "processingImage": "🎨 Generating your image..."
    }
};

async function onCall({ message, args, getLang, data }) {
    const prefix = data?.thread?.data?.prefix || global.config.PREFIX;
    
    if (!args[0]) return message.reply(getLang("invalidInput")(prefix));

    const uid = message.senderID;

    if (args[0].toLowerCase() === "imagine") {
        if (!args[1]) return message.reply(getLang("invalidInput")(prefix));
        
        const prompt = args.slice(1).join(" ");
        await message.reply(getLang("processingImage"));
        
        try {
            const response = await axios.get(encodeURI(`https://api.shizuki.linkpc.net/api/fluxschnell?prompt=${prompt}`), {
                responseType: "arraybuffer"
            });

            const imagePath = join(global.cachePath, `img_${Date.now()}.png`);
            const writer = createWriteStream(imagePath);
            
            writer.write(Buffer.from(response.data, "binary"));
            writer.end();

            return new Promise((resolve, reject) => {
                writer.on("finish", async () => {
                    try {
                        const userInfo = await global.controllers.Users.getInfo(message.senderID);
                        const userName = userInfo?.name || "User";

                        await message.reply({
                            body: `${getLang("imageGenerated")}\n\n🎯 Prompt: ${prompt}\n👤 By: ${userName}`,
                            attachment: global.reader(imagePath),
                            mentions: [{
                                tag: userName,
                                id: message.senderID
                            }]
                        });
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                });
                writer.on("error", reject);
            });
        } catch (error) {
            return message.reply(getLang("processingError"));
        }
    } else {
        const prompt = args.join(" ");
        try {
            const response = await axios.get(`https://api.shizuki.linkpc.net/api/groq?ask=${encodeURIComponent(prompt)}&uid=${uid}`);
            
            if (!response.data) throw new Error("Empty response");

            const userInfo = await global.controllers.Users.getInfo(message.senderID);
            const userName = userInfo?.name || "User";

            return message.reply({
                body: `${response.data.response || response.data}\n\n👤 Asked by: ${userName}`,
                mentions: [{
                    tag: userName,
                    id: message.senderID
                }]
            });
        } catch (error) {
            return message.reply(getLang("processingError"));
        }
    }
}

export default {
    config,
    langData,
    onCall
};
