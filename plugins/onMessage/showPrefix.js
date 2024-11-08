const langData = {
    "en_US": {
        "prefix.get": (prefix) => `🌐 | The bot's current prefix is [ (${prefix}) ].\nType !help to see all commands.`,
        "noPrefix": "🌐 | No prefix is currently set. You can use commands without a prefix."
    }
};

function onCall({ message, getLang, data }) {
    const validTriggers = ["prefix", "Prefix"];

    // Get the prefix from thread data or global config
    const prefix = data?.thread?.data?.prefix || global.config.PREFIX || "";

    if (validTriggers.includes(message.body) && message.senderID !== global.botID) {
        if (prefix) {
            message.reply(getLang("prefix.get", prefix));
        } else {
            message.reply(getLang("noPrefix"));
        }
    }

    return;
}

export default {
    langData,
    onCall
};
