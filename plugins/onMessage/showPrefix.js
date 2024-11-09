const langData = {
    "en_US": {
        "kupal.get": "🌐 | The bot's current prefix is [ {kupal} ].",
        "kupal.noCommand": "❗ | No command detected. Type [ {kupal}help ] to see all available commands."
    }
};

function onCall({ message, getLang, chilli }) {
    const validTriggers = ["prefix", "Prefix"];
    const kupal = chilli?.thread?.data?.prefix || global.config.PREFIX;

    if (message.body === kupal && message.senderID !== global.botID) {
        message.reply(getLang("kupal.noCommand", { kupal }));
    } else if (validTriggers.includes(message.body) && message.senderID !== global.botID) {
        message.reply(getLang("kupal.get", { kupal }));
    }

    return;
}

export default {
    langData,
    onCall
};
