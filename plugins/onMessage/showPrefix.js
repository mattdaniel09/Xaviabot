const langData = {
    "en_US": {
        "prefix.get": "🌐 | The bot's current prefix is [ {prefix} ].\nType {prefix}help to see all commands.",
        "noPrefix": "🌐 | No prefix is currently set. You can use commands without a prefix."
    }
};

function onCall({ message, getLang, data }) {
    const validTriggers = ["prefix", "Prefix"];

    // Check if prefix is set in thread data or config, fallback to no prefix message
    const prefix = data?.thread?.data?.prefix || global.config.PREFIX || "";

    if (validTriggers.includes(message.body) && message.senderID !== global.botID) {
        if (prefix) {
            message.reply(getLang("prefix.get", { prefix }));
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
