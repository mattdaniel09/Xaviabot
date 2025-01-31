import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import getFbVideoInfo from 'priyansh-fb-downloader';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const langData = {
    "en_US": {
        "error.facebook": "⚠️ Failed to download Facebook video: {error}",
        "error.tiktok": "⚠️ Failed to download TikTok content: {error}",
        "error.instagram": "⚠️ Failed to download Instagram content: {error}",
        "error.youtube": "⚠️ Failed to download YouTube video: {error}",
        "error.download": "⚠️ Download error: {error}",
        "success.downloading": "⏳ Downloading media, please wait...",
        "success.downloaded": "✅ Download completed!"
    },
    "vi_VN": {
        "error.facebook": "⚠️ Không thể tải video Facebook: {error}",
        "error.tiktok": "⚠️ Không thể tải nội dung TikTok: {error}",
        "error.instagram": "⚠️ Không thể tải nội dung Instagram: {error}",
        "error.youtube": "⚠️ Không thể tải video YouTube: {error}",
        "error.download": "⚠️ Lỗi tải xuống: {error}",
        "success.downloading": "⏳ Đang tải xuống, vui lòng đợi...",
        "success.downloaded": "✅ Đã tải xuống thành công!"
    }
};

function getTempFilePath(extension = 'mp4') {
    const tempDir = path.join(__dirname, 'tmp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    return path.join(tempDir, `download_${Date.now()}.${extension}`);
}

const urlPatterns = {
    facebook: /https?:\/\/(www\.)?facebook\.com\/(share|reel)\/[^\s]+/gi,
    tiktok: /https?:\/\/((?:vt|vm|www)\.)?tiktok\.com\/[^\s]+/gi,
    instagram: /https?:\/\/(www\.)?instagram\.com\/(reel|p)\/[^\s]+/gi,
    youtube: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)(?:\S+)?/g
};

async function downloadFile(url, extension = 'mp4') {
    const tempFilePath = getTempFilePath(extension);
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
        throw error;
    }
}

async function downloadAndSendVideo(videoUrl, message, getLang) {
    let tempFilePath = null;

    try {
        await message.reply(getLang("success.downloading"));
        const { stream, path } = await downloadFile(videoUrl);
        tempFilePath = path;

        await message.reply({
            body: getLang("success.downloaded"),
            attachment: stream
        });
    } catch (error) {
        throw new Error(getLang("error.download", { error: error.message }));
    } finally {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
}


async function handleFacebookVideo(url, message, getLang) {
    try {
        const videoInfo = await getFbVideoInfo(url);
        const hdLink = videoInfo.hd;
        await downloadAndSendVideo(hdLink, message, getLang);
    } catch (error) {
        throw new Error(getLang("error.facebook", { error: error.message }));
    }
}

async function handleTiktokContent(url, message, getLang) {
    try {
        const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        if (data.code !== 0) {
            throw new Error(data.msg || 'Failed to get content information');
        }

        if (data.data.images && data.data.images.length > 0) {
            const images = data.data.images;
            const attachments = [];

            for (const imageUrl of images) {
                const tempFilePath = tempy.file({ extension: 'jpg' });
                const writer = fs.createWriteStream(tempFilePath);
                
                const imageResponse = await axios({
                    method: 'GET',
                    url: imageUrl,
                    responseType: 'stream'
                });

                imageResponse.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                attachments.push(fs.createReadStream(tempFilePath));
            }

            await message.reply({
                attachment: attachments
            });

            attachments.forEach(attachment => {
                fs.unlinkSync(attachment.path);
            });
        } else if (data.data.play) {
            await downloadAndSendVideo(data.data.play, message, getLang);
        }
    } catch (error) {
        throw new Error(getLang("error.tiktok", { error: error.message }));
    }
}

async function handleInstagramVideo(url, message, getLang) {
    try {
        const apiUrl = `https://zaikyoo.onrender.com/api/instadl?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl);
        const videoUrl = response.data.result;
        await downloadAndSendVideo(videoUrl, message, getLang);
    } catch (error) {
        throw new Error(getLang("error.instagram", { error: error.message }));
    }
}

async function handleYoutubeVideo(url, message, getLang) {
    try {
        const videoId = extractYoutubeVideoId(url);
        if (!videoId) {
            throw new Error('Invalid YouTube URL');
        }

        const cleanUrl = `https://youtu.be/${videoId}`;
        const apiUrl = `https://yt-video-production.up.railway.app/ytdl?url=${encodeURIComponent(cleanUrl)}`;
        const response = await axios.get(apiUrl);
        
        if (!response.data || !response.data.video) {
            throw new Error('Failed to get video URL from API');
        }

        await downloadAndSendVideo(response.data.video, message, getLang);
    } catch (error) {
        throw new Error(getLang("error.youtube", { error: error.message }));
    }
                 }
                        

async function onCall({ message, getLang }) {
    if (!message.body) return;

    try {
        const fbMatches = message.body.match(urlPatterns.facebook);
        const tiktokMatches = message.body.match(urlPatterns.tiktok);
        const igMatches = message.body.match(urlPatterns.instagram);
        const ytMatches = message.body.match(urlPatterns.youtube);

        if (fbMatches) {
            for (const url of fbMatches) {
                await handleFacebookVideo(url, message, getLang);
            }
        }

        if (tiktokMatches) {
            for (const url of tiktokMatches) {
                await handleTiktokContent(url, message, getLang);
            }
        }

        if (igMatches) {
            for (const url of igMatches) {
                await handleInstagramVideo(url, message, getLang);
            }
        }

        if (ytMatches) {
            for (const url of ytMatches) {
                await handleYoutubeVideo(url, message, getLang);
            }
        }
    } catch (error) {
        message.reply(error.message);
    }
}

export default {
    langData,
    onCall
}
