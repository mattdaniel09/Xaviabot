const langData = {
    "en_US": {
        "prefix.get": "🌐 | The bot's current prefix is [ {prefix} ].\nType {prefix}help to see all commands."
    }
};

function onCall({ message, getLang, data }) {
    const validTriggers = ["prefix", "Prefix"];

    if (validTriggers.includes(message.body) && message.senderID !== global.botID) {
        const prefix = data?.thread?.data?.prefix || global.config.PREFIX;
        message.reply(getLang("prefix.get", { prefix }));
    }

    return;
}

export default {
    langData,
    onCall
};
