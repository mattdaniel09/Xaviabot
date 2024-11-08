import axios from "axios";
import { createReadStream, writeFileSync, unlinkSync } from "fs-extra";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cachePath = join(__dirname, './plugins/commands/cache');

const config = {
    name: "pinterest",
    aliases: ["pin"],
    version: "1.0.0",
    role: 0,
    credits: "𝐌𝐀𝐑𝐉𝐇𝐔𝐍 𝐁𝐀𝐘𝐋𝐎𝐍",
    description: "Image search",
    usage: "[Text]",
    commandCategory: "Search",
    cooldown: 0
};

const langData = {
    "en_US": {
        "missingPrompt": (prefix) => `Please enter a prompt.\n\nExample: ${prefix}pinterest ivana alawi - 5`,
        "results": (num, count, search) => `${num} OUT OF ${count} PICS FOUND\n✿━━━━━━━━━━✿\nRESULTS OF: ${search}`
    }
};

async function onCall({ message, args, getLang, data }) {
    const prefix = data?.thread?.data?.prefix || global.config.PREFIX;

    const keySearch = args.join(" ");
    if (!keySearch.includes("-")) {
        return message.reply(getLang("missingPrompt")(prefix));
    }

    const keySearchs = keySearch.substr(0, keySearch.indexOf('-')).trim();
    const numberSearch = parseInt(keySearch.split("-").pop().trim()) || 6;

    try {
        const res = await axios.get(`https://api.kenliejugarap.com/pinterestbymarjhun/?search=${encodeURIComponent(keySearchs)}`);
        const data = res.data && res.data.data;

        if (!data || data.length === 0) {
            return message.reply("No images found for the given search.");
        }

        let imgData = [];
        for (let i = 0; i < Math.min(numberSearch, data.length); i++) {
            const imagePath = join(cachePath, `${i + 1}.jpg`);
            const imageBuffer = (await axios.get(data[i], { responseType: 'arraybuffer' })).data;
            writeFileSync(imagePath, Buffer.from(imageBuffer, 'utf-8'));
            imgData.push(createReadStream(imagePath));
        }

        message.reply({
            body: getLang("results")(numberSearch, data.length, keySearchs),
            attachment: imgData
        });

        // Clean up the cached images after sending
        for (let i = 1; i <= Math.min(numberSearch, data.length); i++) {
            unlinkSync(join(cachePath, `${i}.jpg`));
        }
    } catch (error) {
        console.error("Error in pinterest command:", error);
        message.reply("An error occurred while fetching images.");
    }
}

export default {
    config,
    langData,
    onCall
};
