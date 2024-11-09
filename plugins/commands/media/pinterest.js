import axios from 'axios';

const config = {
    name: "pinterest",
    aliases: ["pin"],
    version: "1.0",
    credits: "chilli",
    description: "Search and retrieve Pinterest images based on keywords",
    usages: "<keyword> -<count>",
    category: "Media",
    cooldown: 5
};

async function onCall({ message, args }) {
    const { messageID, threadID } = message;
    const input = args.join(" ");
    const keyword = input.replace(/-\d+$/, "").trim();
    const countMatch = input.match(/-(\d+)$/);
    const count = countMatch ? parseInt(countMatch[1], 10) : 5;

    if (!keyword) {
        return message.send("Please provide a search keyword for Pinterest.");
    }

    try {
        await message.react("🔎");

        const response = await axios.get(`https://api.kenliejugarap.com/pinterestbymarjhun/?search=${encodeURIComponent(keyword)}`);
        const { data, count: availableCount } = response.data;

        if (!data || data.length === 0) {
            return message.send(`No images found for "${keyword}".`);
        }

        const imagesToSend = data.slice(0, Math.min(count, availableCount));
        
        await message.reply({
            body: `📌 Pinterest results for "${keyword}":`,
            attachment: imagesToSend.map((url) => url)
        });
    } catch (error) {
        console.error("Error occurred:", error);
        await message.send(`An error occurred: ${error.message}`);
    }
}

export default {
    config,
    onCall
};
