const config = {
    name: "help",
    aliases: ["cmds", "commands"],
    version: "1.0.3",
    description: "Show all commands or command details",
    usage: "[command] (optional)",
    credits: "XaviaTeam"
};

const langData = {
    "en_US": {
        "help.list": "{list}\n\n⇒ Total: {total} commands\n⇒ Use {syntax} [command] to get more information about a command.",
        "help.commandNotExists": "Command {command} does not exist.",
        "help.commandDetails": `
            ⇒ Name: {name}
            ⇒ Aliases: {aliases}
            ⇒ Version: {version}
            ⇒ Description: {description}
            ⇒ Usage: {usage}
            ⇒ Permissions: {permissions}
            ⇒ Category: {category}
            ⇒ Cooldown: {cooldown}
            ⇒ Credits: {credits}
        `,
        "0": "Member",
        "1": "Group Admin",
        "2": "Bot Admin"
    }
};

function getCommandName(commandName) {
    if (global.plugins.commandsAliases.has(commandName)) return commandName;

    for (let [key, value] of global.plugins.commandsAliases) {
        if (value.includes(commandName)) return key;
    }
    return null;
}

async function onCall({ message, args, getLang, userPermissions, prefix }) {
    const { commandsConfig } = global.plugins;
    const commandName = args[0]?.toLowerCase();

    if (!commandName) {
        // Paginate commands list
        let page = parseInt(args[1]) || 1;
        const itemsPerPage = 10;

        let commands = {};
        const language = global.config.LANGUAGE || 'en_US';
        
        for (const [key, value] of commandsConfig.entries()) {
            if (value.isHidden) continue;
            if (value.isAbsolute && !global.config.ABSOLUTES.includes(message.senderID)) continue;
            if (!value.permissions.some(p => userPermissions.includes(p))) continue;
            if (!commands[value.category]) commands[value.category] = [];
            commands[value.category].push(value._name && value._name[language] ? value._name[language] : key);
        }

        const categories = Object.keys(commands);
        const totalCommands = categories.reduce((sum, cat) => sum + commands[cat].length, 0);
        const totalPages = Math.ceil(totalCommands / itemsPerPage);

        if (page < 1 || page > totalPages) page = 1;

        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;

        const list = categories
            .map(category => {
                const cmds = commands[category].slice(start, end).join(", ");
                return cmds ? `⌈ ${category.toUpperCase()} ⌋\n${cmds}` : '';
            })
            .filter(Boolean)
            .join("\n\n");

        message.reply(getLang("help.list", {
            total: totalCommands,
            list,
            syntax: `${prefix}help`,
            page,
            totalPages
        }));
    } else {
        // Show details of a specific command
        const command = commandsConfig.get(getCommandName(commandName));
        if (!command) return message.reply(getLang("help.commandNotExists", { command: commandName }));

        const isHidden = command.isHidden;
        const isUserValid = !command.isAbsolute || global.config.ABSOLUTES.includes(message.senderID);
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
