import axios from 'axios';
import fs from 'fs-extra';
import tempy from 'tempy';

const langData = {
    "en_US": {
        "shoti.downloading": "⏳ Downloading shoti video...",
        "shoti.success": "📹 Video from @{username}\n💭 Caption: {title}",
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
    credits: "Mark"
};

async function downloadVideo(url, message, getLang) {
    const tempFilePath = tempy.file({ extension: 'mp4' });
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

        return fs.createReadStream(tempFilePath);
    } catch (error) {
        throw new Error(getLang("shoti.error.download", { error: error.message }));
    } finally {
        // Schedule cleanup of temp file after sending
        setTimeout(() => {
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
        }, 10000);
    }
}

async function onCall({ message, getLang }) {
    try {
        await message.reply(getLang("shoti.downloading"));

        const response = await axios.get('https://shoti-production.up.railway.app/shoti?apiKey=shotizzx1');
        
        if (!response.data || !response.data.play) {
            throw new Error(getLang("shoti.error.api", { error: "Invalid response" }));
        }

        const { title, username, play } = response.data;
        const videoStream = await downloadVideo(play, message, getLang);

        return message.reply({
            body: getLang("shoti.success", { username, title }),
            attachment: videoStream
        });
    } catch (error) {
        return message.reply(getLang("shoti.error.general", { error: error.message }));
    }
}

export default {
    config,
    langData,
    onCall
}
