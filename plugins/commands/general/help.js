async function onCall({ message, args, getLang, userPermissions, prefix }) {
    const { commandsConfig } = global.plugins;
    const commandName = args[0]?.toLowerCase();

    const pages = [
        ["GENERAL", "MEDIA", "GROUP"],
        ["ADMIN", "FUN", "UTILITY"],
        // Add other pages as needed
    ];

    if (!commandName || commandName === "all") {
        let commands = {};
        const language = data?.thread?.data?.language || global.config.LANGUAGE || 'en_US';

        for (const [key, value] of commandsConfig.entries()) {
            if (value.isHidden) continue;
            if (value.isAbsolute && !global.config?.ABSOLUTES.includes(message.senderID)) continue;
            if (!value.hasOwnProperty("permissions")) value.permissions = [0, 1, 2];
            if (!value.permissions.some(p => userPermissions.includes(p))) continue;
            if (!commands[value.category]) commands[value.category] = [];
            commands[value.category].push(value._name?.[language] || key);
        }

        if (commandName === "all") {
            const list = Object.keys(commands)
                .map(category => `⌈ ${category.toUpperCase()} ⌋\n${commands[category].map((cmd, index) => `${index + 1}. ${cmd}`).join("\n")}`)
                .join("\n\n");

            return message.reply(getLang("help.list", {
                total: Object.values(commands).flat().length,
                list: list || "No commands available",
                syntax: `${prefix}help`
            }));
        }

        const pageNumber = parseInt(args[1]) || 1;
        if (pageNumber < 1 || pageNumber > pages.length) {
            return message.reply(`Invalid page number. Available pages: 1-${pages.length}`);
        }

        const selectedCategories = pages[pageNumber - 1];
        const list = selectedCategories
            .map(category => {
                if (!commands[category]) return null;
                return `⌈ ${category.toUpperCase()} ⌋\n${commands[category].map((cmd, index) => `${index + 1}. ${cmd}`).join("\n")}`;
            })
            .filter(Boolean)
            .join("\n\n");

        return message.reply(`Page ${pageNumber}/${pages.length}\n\n${getLang("help.list", {
            total: Object.values(commands).map(e => e.length).reduce((a, b) => a + b, 0),
            list: list || "No commands available",
            syntax: `${prefix}help`
        })}`);
    } else {
        const command = commandsConfig.get(getCommandName(commandName, commandsConfig));
        if (!command) return message.reply(getLang("help.commandNotExists", { command: commandName }));

        const isHidden = !!command.isHidden;
        const isUserValid = command.isAbsolute ? global.config?.ABSOLUTES.includes(message.senderID) : true;
        const isPermissionValid = command.permissions.some(p => userPermissions.includes(p));
        if (isHidden || !isUserValid || !isPermissionValid)
            return message.reply(getLang("help.commandNotExists", { command: commandName }));

        message.reply(getLang("help.commandDetails", {
            name: command.name || "Unknown",
            aliases: command.aliases?.join(", ") || "None",
            version: command.version || "1.0.0",
            description: command.description || "No description available",
            usage: `${prefix}${commandName} ${command.usage || ''}`,
            permissions: command.permissions.map(p => getLang(String(p)) || "Unknown").join(", "),
            category: command.category || "Uncategorized",
            cooldown: command.cooldown || 3,
            credits: command.credits || "Unknown"
        }).replace(/^ +/gm, ''));
    }
}
