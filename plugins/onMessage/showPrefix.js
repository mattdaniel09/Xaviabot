const langData = {
    "en_US": {
        "prefix.get": "The bot's current prefix is [ {prefix} ].",
        "prefix.noCommand": "No command detected. Type {prefix}help  to see all available commands."
    }
};

function onCall({ message, getLang, chilli }) {
    const validTriggers = ["prefix", "Prefix"];
    const prefix = chilli?.thread?.data?.prefix || global.config.PREFIX;

    if (message.body === prefix && message.senderID !== global.botID) {
        message.reply(getLang("prefix.noCommand", { prefix }));
    } else if (validTriggers.includes(message.body) && message.senderID !== global.botID) {
        message.reply(getLang("prefix.get", { prefix }));
    }

    return;
}

export default {
    langData,
    onCall
};
