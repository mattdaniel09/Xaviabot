import fs from 'fs';
import path from 'path';

const commandRootDir = path.resolve('./plugins/commands');

const fetchCommandFiles = () => {
    const commandFiles = [];
    const categories = fs.readdirSync(commandRootDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    for (const category of categories) {
        const commandDir = path.join(commandRootDir, category);
        const commands = fs.readdirSync(commandDir)
            .filter(file => file.endsWith('.js'))
            .map(file => path.join(commandDir, file));

        if (commands.length > 0) {
            commandFiles.push({
                category,
                commands
            });
        }
    }

    return commandFiles;
};

const loadCommand = async (filePath) => {
    try {
        const { default: commandModule } = await import(filePath);
        if (commandModule?.config?.name) {
            return { commandModule, name: commandModule.config.name };
        } else {
            console.warn(`Command config.name not found in ${filePath}`);
            return null;
        }
    } catch (error) {
        console.error(`Failed to load command from ${filePath}:`, error);
        return null;
    }
};

async function onCall({ message }) {
    const input = message.body.trim();

    const commandFiles = fetchCommandFiles();
    for (const { commands } of commandFiles) {
        for (const filePath of commands) {
            const commandData = await loadCommand(filePath);
            if (commandData && input.toLowerCase().startsWith(commandData.name)) {
                const { commandModule, name } = commandData;
                const args = input.slice(name.length).trim().split(" ");

                // Check if the command requires a prompt and show an example if missing
                if (args.length === 0) {
                    const prefix = "";  // Adjust this if you need to set a specific prefix for example
                    return message.reply(commandModule.langData["en_US"].missingPrompt(prefix));
                }

                // Execute the command with provided arguments
                await commandModule.onCall({
                    message,
                    args,
                    data: { thread: { data: { prefix: "" } } },
                    userPermissions: message.senderID
                });
                return;
            }
        }
    }

    console.warn('No matching command found.');
}

export default {
    onCall
};
