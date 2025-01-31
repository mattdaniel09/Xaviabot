import {} from "dotenv/config";
import { writeFileSync, readFileSync } from "fs";
import { resolve as resolvePath } from "path";
import crypto from "crypto";
import { execSync } from "child_process";
import login from "skibidi-fca-v2";
import replitDB from "@replit/database";
import util from 'util';

import logger from "./var/modules/logger.js";
import startServer from "./dashboard/server/app.js";
import handleListen from "./handlers/listen.js";
import environments from "./var/modules/environments.get.js";
import _init_var from "./var/_init.js";
import {
    initDatabase,
    updateJSON,
    updateMONGO,
    _Threads,
    _Users,
} from "./handlers/database.js";

const { isGlitch, isReplit } = environments;
const TWELVE_HOURS = 1000 * 60 * 60 * 12;
const TWO_HOURS = 1000 * 60 * 60 * 2;
const MAX_LOGIN_RETRIES = 3;
const RETRY_DELAY = 5000;

const formatError = (error) => {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.stack || error.message;
    return util.inspect(error, { depth: null, colors: false });
};

const setupProcessHandlers = () => {
    process.on("unhandledRejection", (error, promise) => {
        const formattedError = formatError(error);
        logger.error(`Unhandled Rejection: ${formattedError}`);
    });

    process.on("uncaughtException", (error) => {
        const formattedError = formatError(error);
        logger.error(`Uncaught Exception: ${formattedError}`);
    });

    const handleExit = () => {
        try {
            logger.system("Shutting down...");
            if (global.refreshState) clearInterval(global.refreshState);
            if (global.refreshMqtt) clearInterval(global.refreshMqtt);
            if (global.listenMqtt) global.listenMqtt.stopListening();
            if (global.api) saveAppState(global.api).catch(console.error);
            process.exit();
        } catch (error) {
            const formattedError = formatError(error);
            logger.error(`Error during shutdown: ${formattedError}`);
            process.exit(1);
        }
    };

    ["SIGINT", "SIGTERM", "SIGHUP"].forEach(signal => {
        process.on(signal, handleExit);
    });

    global.shutdown = handleExit;
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const readAppState = async () => {
    try {
        const { APPSTATE_PATH, APPSTATE_PROTECTION } = global.config;
        let appState;

        if (APPSTATE_PROTECTION && isReplit) {
            const db = new replitDB();
            const secretKey = await db.get("APPSTATE_SECRET_KEY");
            if (!secretKey) throw new Error("APPSTATE_SECRET_KEY not found in Replit DB");

            const encryptedState = JSON.parse(readFileSync(APPSTATE_PATH, 'utf8'));
            appState = JSON.parse(global.modules.get("aes").decrypt(encryptedState, secretKey));
        } else {
            const statePath = isGlitch 
                ? resolvePath(process.cwd(), ".data", "appstate.json")
                : APPSTATE_PATH;
            appState = JSON.parse(readFileSync(statePath, 'utf8'));
        }

        if (!Array.isArray(appState)) {
            throw new Error("Invalid AppState format");
        }

        return appState;
    } catch (error) {
        throw new Error(`Failed to read AppState: ${formatError(error)}`);
    }
};

const saveAppState = async (api) => {
    try {
        const newAppState = api.getAppState();
        if (!Array.isArray(newAppState)) {
            throw new Error("Invalid AppState received from API");
        }

        const { APPSTATE_PATH, APPSTATE_PROTECTION } = global.config;

        if (APPSTATE_PROTECTION && isReplit) {
            const db = new replitDB();
            const secretKey = await db.get("APPSTATE_SECRET_KEY");
            if (!secretKey) throw new Error("APPSTATE_SECRET_KEY not found");

            const encrypted = global.modules.get("aes").encrypt(
                JSON.stringify(newAppState),
                secretKey
            );
            writeFileSync(APPSTATE_PATH, JSON.stringify(encrypted));
        } else {
            const savePath = isGlitch 
                ? resolvePath(process.cwd(), ".data", "appstate.json")
                : APPSTATE_PATH;
            writeFileSync(savePath, JSON.stringify(newAppState, null, 2));
        }

        return true;
    } catch (error) {
        logger.error(`Failed to save AppState: ${formatError(error)}`);
        return false;
    }
};

const loginWithRetry = async (retryCount = 0) => {
    try {
        const appState = await readAppState();
        const { FCA_OPTIONS } = global.config;

        return new Promise((resolve, reject) => {
            const loginOptions = {
                appState,
                ...FCA_OPTIONS,
                logLevel: "silent"
            };

            login(loginOptions, async (error, api) => {
                if (error) {
                    const formattedError = formatError(error);
                    if (retryCount < MAX_LOGIN_RETRIES) {
                        logger.warn(`Login attempt ${retryCount + 1} failed: ${formattedError}\nRetrying in ${RETRY_DELAY/1000}s...`);
                        await delay(RETRY_DELAY);
                        try {
                            const result = await loginWithRetry(retryCount + 1);
                            resolve(result);
                        } catch (retryError) {
                            reject(retryError);
                        }
                    } else {
                        reject(new Error(`Login failed after ${MAX_LOGIN_RETRIES} attempts. Last error: ${formattedError}`));
                    }
                } else {
                    if (!api) {
                        reject(new Error("API object is null after successful login"));
                        return;
                    }
                    resolve(api);
                }
            });
        });
    } catch (error) {
        throw new Error(`Login initialization failed: ${formatError(error)}`);
    }
};

const setupListeners = async (api) => {
    if (!api) throw new Error("API object is required for listener setup");
    
    const listenerID = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    global.listenerID = listenerID;

    try {
        const handler = await handleListen(listenerID);
        global.listenMqtt = api.listenMqtt(handler);

        global.refreshMqtt = setInterval(async () => {
            try {
                logger.custom("Refreshing MQTT connection", "REFRESH");
                const newListenerID = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
                if (global.listenMqtt) global.listenMqtt.stopListening();
                global.listenerID = newListenerID;
                global.listenMqtt = api.listenMqtt(await handleListen(newListenerID));
            } catch (error) {
                logger.error(`MQTT refresh failed: ${formatError(error)}`);
            }
        }, TWO_HOURS);

        global.refreshState = setInterval(async () => {
            try {
                logger.custom("Saving AppState", "REFRESH");
                await saveAppState(api);
            } catch (error) {
                logger.error(`AppState refresh failed: ${formatError(error)}`);
            }
        }, TWELVE_HOURS);

    } catch (error) {
        throw new Error(`Failed to setup listeners: ${formatError(error)}`);
    }
};

const initializeBot = async (api) => {
    try {
        if (!api) throw new Error("API object is required for bot initialization");

        global.api = api;
        global.botID = api.getCurrentUserID();
        
        if (!global.botID) {
            throw new Error("Failed to get bot ID");
        }

        logger.custom(`Bot logged in successfully as ${global.botID}`, "LOGIN");
        await setupListeners(api);

        if (global.config.REFRESH) {
            setTimeout(() => {
                logger.system("Scheduled restart initiated");
                global.restart();
            }, global.config.REFRESH);
        }

        return true;
    } catch (error) {
        throw new Error(`Bot initialization failed: ${formatError(error)}`);
    }
};

const initializeServer = () => {
    try {
        const serverPassword = crypto.randomBytes(8).toString('hex');
        startServer(serverPassword);
        process.env.SERVER_ADMIN_PASSWORD = serverPassword;
        return true;
    } catch (error) {
        throw new Error(`Server initialization failed: ${formatError(error)}`);
    }
};

const start = async () => {
    try {
        setupProcessHandlers();
        
        await _init_var();
        logger.system("Variables initialized successfully");
        
        await initDatabase();
        global.updateJSON = updateJSON;
        global.updateMONGO = updateMONGO;
        global.controllers = { Threads: _Threads, Users: _Users };
        logger.system("Database initialized successfully");
        
        if (!initializeServer()) {
            throw new Error("Server initialization failed");
        }
        
        logger.custom("Attempting login...", "LOGIN");
        const api = await loginWithRetry();
        
        if (!api) {
            throw new Error("Login successful but API object is null");
        }
        
        await initializeBot(api);
        logger.system("Bot started successfully");
    } catch (error) {
        const formattedError = formatError(error);
        logger.error(`Startup failed: ${formattedError}`);
        await delay(1000);
        process.exit(1);
    }
};

start();
