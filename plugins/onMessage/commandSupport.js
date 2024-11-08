import fs from 'fs';
import path from 'path';

const commandRootDir = path.resolve('./plugins/commands');

// Function to fetch command files organized by category
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

// Function to dynamically load each command module
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

// Main handler function to execute commands based on incoming messages
async function onCall({ message }) {
    const input = message.body.trim().toLowerCase();
    const commandFiles = fetchCommandFiles();

    // Iterate over all commands to find a match
    for (const { commands } of commandFiles) {
        for (const filePath of commands) {
            const commandData = await loadCommand(filePath);
            if (commandData && input.startsWith(commandData.name)) {
                const { commandModule, name } = commandData;

                // Define arguments and prefix
                const args = input.slice(name.length).trim().split(" ");
                const prefix = message.thread?.data?.prefix || global.config.PREFIX || "";

                // Check if prefix is set, or if no prefix is needed
                if (prefix === "" || input.startsWith(prefix + name)) {
                    await commandModule.onCall({
                        message,
                        args,
                        data: { thread: { data: { prefix } } },
                        userPermissions: message.senderID,
                        prefix
                    });
                } else {
                    console.warn(`Command ${name} requires prefix.`);
                }
                return;
            }
        }
    }

    console.warn('No matching command found.');
}

export default {
    onCall
};
