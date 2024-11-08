const langData = {
    "en_US": {
        "prefix.get": "🌐 | Bot's Current Prefix is [ {prefix} ]\nChat {prefix}help to see all commands."
    }
}

function onCall({ message, getLang, data }) {
    const validTriggers = ["prefix", "chill"];

    if (validTriggers.includes(message.body) && message.senderID !== global.botID) {
        message.reply(getLang("prefix.get", {
            prefix: data?.thread?.data?.prefix || global.config.PREFIX
        }));
    }

    return;
}

export default {
    langData,
    onCall
}
