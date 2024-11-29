const axios = require("axios");
const cron = require("node-cron");

let isAutoPostEnabled = false;
let lastPostTime = 0;
const ALLOWED_UID = "100087212564100";

module.exports.config = {
    name: "post",
    version: "1.0.0",
    description: "Automatically posts cat facts every 30 minutes.",
    permissions: 0,
    cooldown: 5,
    category: "Utility",
    usage: "[on|off]",
    credits: "chilli",
};

module.exports.onCall = async function ({ message, args, api }) {
    const senderID = message.senderID;

    if (senderID !== ALLOWED_UID) {
        return message.reply("You do not have permission to control the autopost feature.");
    }

    if (args.length === 0) {
        return message.reply(`Please specify "on" to enable or "off" to disable autoposting.`);
    }

    const action = args[0].toLowerCase();
    if (action === "on") {
        if (isAutoPostEnabled) {
            return message.reply("AutoPost is already enabled.");
        }

        isAutoPostEnabled = true;
        setupAutoPost(api);
        return message.reply("AutoPost has been enabled. A cat fact will be posted every 30 minutes.");
    }

    if (action === "off") {
        if (!isAutoPostEnabled) {
            return message.reply("AutoPost is already disabled.");
        }

        isAutoPostEnabled = false;
        return message.reply("AutoPost has been disabled.");
    }

    return message.reply(`Invalid option. Please use "on" or "off".`);
};

function setupAutoPost(api) {
    cron.schedule("*/30 * * * *", async function () {
        if (!isAutoPostEnabled) return;

        const currentTime = Date.now();
        const cooldownPeriod = 30 * 60 * 1000;

        if (currentTime - lastPostTime < cooldownPeriod) {
            console.log("Cooldown in effect. Skipping auto post...");
            return;
        }

        try {
            const response = await axios.get("https://catfact.ninja/fact");
            const catFact = response.data.fact;

            const message = `🐾 Random Cat Fact 🐾\n\n"${catFact}"`;

            const formData = {
                input: {
                    composer_entry_point: "inline_composer",
                    composer_source_surface: "timeline",
                    idempotence_token: `${Date.now()}_FEED`,
                    source: "WWW",
                    message: {
                        text: message,
                    },
                    audience: {
                        privacy: {
                            base_state: "EVERYONE",
                        },
                    },
                    actor_id: api.getCurrentUserID(),
                },
            };

            const postResult = await api.httpPost(
                "https://www.facebook.com/api/graphql/",
                {
                    av: api.getCurrentUserID(),
                    fb_api_req_friendly_name: "ComposerStoryCreateMutation",
                    fb_api_caller_class: "RelayModern",
                    doc_id: "7711610262190099",
                    variables: JSON.stringify(formData),
                }
            );

            const postID = postResult.data.story_create.story.legacy_story_hideable_id;
            const postLink = `https://www.facebook.com/${api.getCurrentUserID()}/posts/${postID}`;

            api.sendMessage(`[AUTO POST SUCCESS]\nLink: ${postLink}`, senderID);
            console.log(`[AUTO POST SUCCESS]\nLink: ${postLink}`);

            lastPostTime = currentTime;
        } catch (error) {
            console.error("Error during auto-posting:", error);
        }
    });
}
