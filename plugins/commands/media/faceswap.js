import axios from "axios";
import fs from "fs-extra";

const config = {
    name: "faceswap",
    description: "Swap faces between two images by replying to a message with attachments.",
    usage: "Reply to a message with two image attachments",
    cooldown: 3,
    category: "Image Editing",
    credits: "chilli"
};

async function onCall({ message }) {
    // Ensure the user replied to a message
    if (!message.messageReply || !message.messageReply.attachments || message.messageReply.attachments.length < 2) {
        return message.reply("❗ Please **reply to a message** containing **two image attachments** to perform a face swap.");
    }

    const attachments = message.messageReply.attachments;

    // Check for valid URLs of the attached images
    const baseImage = attachments[0];
    const swapImage = attachments[1];
    if (!baseImage.url || !swapImage.url) {
        return message.reply("⚠️ Failed to retrieve the image URLs from the replied message. Please try again.");
    }

    await message.react("🔄"); // React to indicate processing

    try {
        // Perform API call for face swap
        const apiUrl = `https://kaiz-apis.gleeze.com/api/faceswap?swapUrl=${encodeURIComponent(
            swapImage.url
        )}&baseUrl=${encodeURIComponent(baseImage.url)}`;

        const response = await axios.get(apiUrl, { responseType: "arraybuffer" });

        if (response.status !== 200) {
            await message.react("❌");
            return message.reply("❗ Failed to process the face swap. Please try again later.");
        }

        // Save the swapped image locally
        const swappedImagePath = `${global.cachePath || "./cache"}/faceswap_${Date.now()}.jpg`;
        await fs.outputFile(swappedImagePath, response.data);

        // Send the swapped image as a reply
        await message.react("✅");
        await message.reply({
            body: "👥 **Face Swap Complete!** Here is your swapped image:",
            attachment: fs.createReadStream(swappedImagePath)
        });
    } catch (error) {
        console.error("Error in Face Swap command:", error);
        await message.react("❌");
        message.reply("⚠️ An error occurred while performing the face swap.");
    }
}

export default {
    config,
    onCall
};
