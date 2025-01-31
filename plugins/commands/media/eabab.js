import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const langData = {
    "en_US": {
        "shoti.downloading": "⏳ Downloading shoti video...",
        "shoti.success": "@{username}\n💭 Caption: {title}",
        "shoti.error.download": "⚠️ Failed to download video: {error}",
        "shoti.error.api": "⚠️ Failed to fetch video: {error}",
        "shoti.error.general": "⚠️ An error occurred: {error}"
    },
    "vi_VN": {
        "shoti.downloading": "⏳ Đang tải video shoti...",
        "shoti.success": "📹 Video từ @{username}\n💭 Tiêu đề: {title}",
        "shoti.error.download": "⚠️ Không thể tải video: {error}",
        "shoti.error.api": "⚠️ Không thể lấy video: {error}",
        "shoti.error.general": "⚠️ Đã xảy ra lỗi: {error}"
    }
};

const config = {
    name: "shoti",
    aliases: ["eabab"],
    permissions: [0, 1, 2],
    description: "Get random Hot Girl TikTok video",
    usage: "<prefix>shoti",
    cooldown: 15,
    credits: "Xavia"
};

function getTempFilePath() {
    const tempDir = path.join(__dirname, 'tmp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    return path.join(tempDir, `shoti_${Date.now()}.mp4`);
}

async function downloadVideo(url, message, getLang) {
    const tempFilePath = getTempFilePath();
    const writer = fs.createWriteStream(tempFilePath);

    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream'
        });

        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        return {
            stream: fs.createReadStream(tempFilePath),
            path: tempFilePath
        };
    } catch (error) {
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
        throw new Error(getLang("shoti.error.download", { error: error.message }));
    }
}

async function onCall({ message, getLang }) {
    let tempFilePath = null;
    
    try {
        await message.reply(getLang("shoti.downloading"));

        const response = await axios.get('https://shoti-production.up.railway.app/shoti?apiKey=shotizzx1');
        
        if (!response.data || !response.data.play) {
            throw new Error(getLang("shoti.error.api", { error: "Invalid response" }));
        }

        const { title, username, play } = response.data;
        const { stream, path } = await downloadVideo(play, message, getLang);
        tempFilePath = path;

        await message.reply({
            body: getLang("shoti.success", { username, title }),
            attachment: stream
        });
    } catch (error) {
        await message.reply(getLang("shoti.error.general", { error: error.message }));
    } finally {
        // Cleanup temp file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
}

export default {
    config,
    langData,
    onCall
}
