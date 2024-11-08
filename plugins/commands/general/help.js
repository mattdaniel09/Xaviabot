const config = {
    name: "help",
    _name: {
        "ar_SY": "الاوامر"
    },
    aliases: ["cmds", "commands"],
    version: "1.0.3",
    description: "Show all commands or command details",
    usage: "[command] (optional)",
    credits: "XaviaTeam"
}

const langData = {
    // Language data as you provided...
};

function getCommandName(commandName) {
    if (global.plugins.commandsAliases.has(commandName)) return commandName;

    for (let [key, value] of global.plugins.commandsAliases) {
        if (value.includes(commandName)) return key;
    }

    return null
}

async function onCall({ message, args, getLang, userPermissions, prefix }) {
    const { commandsConfig } = global.plugins;
    const commandName = args[0]?.toLowerCase();

    // Page definitions, categorizing commands
    const pages = [
        ["general", "media", "group"],
        ["admin", "fun", "utility"],
        // Add other pages as needed
    ];

    if (!commandName || commandName === "all") {
        let commands = {};
        const language = data?.thread?.data?.language || global.config.LANGUAGE || 'en_US';

        // Organize commands by category
        for (const [key, value] of commandsConfig.entries()) {
            if (!!value.isHidden) continue;
            if (!!value.isAbsolute ? !global.config?.ABSOLUTES.some(e => e == message.senderID) : false) continue;
            if (!value.hasOwnProperty("permissions")) value.permissions = [0, 1, 2];
            if (!value.permissions.some(p => userPermissions.includes(p))) continue;
            if (!commands.hasOwnProperty(value.category)) commands[value.category] = [];
            const commandName = value._name && value._name[language] ? value._name[language] : key;
            commands[value.category].push(commandName);
        }

        // If "help all", compile all categories into one list
        if (commandName === "all") {
            let list = Object.keys(commands)
                .map(category => `⌈ ${category.toUpperCase()} ⌋\n${commands[category].map((cmd, index) => `${index + 1}. ${cmd}`).join("\n")}`)
                .join("\n\n");

            return message.reply(getLang("help.list", {
                total: Object.values(commands).flat().length,
                list,
                syntax: `${prefix}help`
            }));
        }

        // Otherwise, paginate based on the defined pages
        const pageNumber = parseInt(args[1]) || 1;
        if (pageNumber < 1 || pageNumber > pages.length) {
            return message.reply(`Invalid page number. Available pages: 1-${pages.length}`);
        }

        // Compile commands for the specific page
        const selectedCategories = pages[pageNumber - 1];
        let list = selectedCategories
            .map(category => {
                if (!commands[category]) return null;
                return `⌈ ${category.toUpperCase()} ⌋\n${commands[category].map((cmd, index) => `${index + 1}. ${cmd}`).join("\n")}`;
            })
            .filter(Boolean) // Filter out empty categories
            .join("\n\n");

        message.reply(`Page ${pageNumber}/${pages.length}\n\n${getLang("help.list", {
            total: Object.values(commands).map(e => e.length).reduce((a, b) => a + b, 0),
            list,
            syntax: `${prefix}help`
        })}`);
    } else {
        const command = commandsConfig.get(getCommandName(commandName, commandsConfig));
        if (!command) return message.reply(getLang("help.commandNotExists", { command: commandName }));

        const isHidden = !!command.isHidden;
        const isUserValid = !!command.isAbsolute ? global.config?.ABSOLUTES.some(e => e == message.senderID) : true;
        const isPermissionValid = command.permissions.some(p => userPermissions.includes(p));
        if (isHidden || !isUserValid || !isPermissionValid)
            return message.reply(getLang("help.commandNotExists", { command: commandName }));

        message.reply(getLang("help.commandDetails", {
            name: command.name,
            aliases: command.aliases.join(", "),
            version: command.version || "1.0.0",
            description: command.description || '',
            usage: `${prefix}${commandName} ${command.usage || ''}`,
            permissions: command.permissions.map(p => getLang(String(p))).join(", "),
            category: command.category,
            cooldown: command.cooldown || 3,
            credits: command.credits || ""
        }).replace(/^ +/gm, ''));
    }
}

export default {
    config,
    langData,
    onCall
};
