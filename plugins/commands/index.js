// plugins/commands/index.js
const fs = require('fs');
const path = require('path');

// Object to store all command modules
const commands = {};

// Dynamically load each command file
fs.readdirSync(__dirname).forEach(file => {
    if (file !== 'index.js' && file.endsWith('.js')) {
        const commandName = file.replace('.js', '');
        commands[commandName] = require(path.join(__dirname, file));
    }
});

module.exports = commands;
