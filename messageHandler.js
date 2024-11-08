import fs from 'fs';
import path from 'path';

const commandRootDir = path.resolve('./plugins/commands');

// Fetch all command files in subdirectories
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

// Load a specific command file
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

// Handle incoming messages and execute matching commands
async function onCall({ message }) {
    const input = message.body.trim().toLowerCase();

    const commandFiles = fetchCommandFiles();
    for (const { commands } of commandFiles) {
        for (const filePath of commands) {
            const commandData = await loadCommand(filePath);
            if (commandData && input.startsWith(commandData.name)) {  // Match command name directly, no prefix
                const { commandModule, name } = commandData;

                if (commandModule?.config && commandModule.onCall) {
                    const args = input.slice(name.length).trim().split(" ");

                    await commandModule.onCall({ 
                        message, 
                        args, 
                        data: { thread: { data: { prefix: "" } } },  // No prefix
                        userPermissions: message.senderID
                    });
                } else {
                    console.warn(`Command ${name} is not properly configured or missing onCall function.`);
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
