/**
 * File Description:
 * This file contains the background script for the extension. It listens for messages
 * from the content script and sends the image URL to the server to be described.
 *
 * See the Chrome extension documentation for more information:
 * https://developer.chrome.com/docs/extensions/mv3/background_pages/
 */

import I2TModelXS from './i2t-model-xs';
import { getToken } from './auth';
import Logger from './log';
import { loadLoggingState } from './log';
import {
    ACTION_DESCRIBE_IMAGE, ACTION_LOGIN, ACTION_LOG,
    SERVER_URL, SERVER_LOGIN_PATH
} from './constants';

const log = new Logger('background.js', getToken);
const contentScriptLog = new Logger('content.js', getToken);
const model = new I2TModelXS();

// Listen for login button
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.name === ACTION_LOGIN) {
        // Acquire access token
        login(message.username, message.password);
    } else if (message.action === ACTION_DESCRIBE_IMAGE) {
        describe(message, sendResponse);
    } else if (message.action === ACTION_LOG) {
        contentScriptLog.sendLog(message.message, message.level);
        return false; // Indicate synchronous response
    }
    return true; // Indicate asynchronous response
})

// Request i2t model to describe
const describe = (message, sendResponse) => {
    if (!message.height || !message.width || !message.rawImageData) {
        log.error("Invalid image data");
        return;
    }
    log.debug(`Received image to describe: ${message.url}`)

    // Convert raw image data to ImageData
    const imageData = new ImageData(
        Uint8ClampedArray.from(message.rawImageData), message.width, message.height);

    // Request the i2t model to describe the image
    model.describeImage(imageData, message.url).then((desription) => {
        sendResponse({ description: desription });
    }).catch((err) => {
        log.error(err);
        sendResponse({ description: "An error occurred while describing the image." });
    });
}

// Get and set access token
const login = (user, pass) => {
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({username: user, password: pass})
    };

    fetch(`${SERVER_URL}${SERVER_LOGIN_PATH}`, options)
        .then(response => response.json())
        .then(response => {
            chrome.storage.sync.set({token: response.access_token});
        })
        .catch(err => console.error(err));
}

const logSystemInfo = async () => {
    let systemInfo = {};

    const cpuInfoPromise = new Promise((resolve) => {
        chrome.system.cpu.getInfo((info) => {
            systemInfo.cpuArch = info.archName;
            systemInfo.cpuModel = info.modelName;
            systemInfo.cpuNumOfProcessors = info.numOfProcessors;
            resolve();
        });
    });

    const memoryInfoPromise = new Promise((resolve) => {
        chrome.system.memory.getInfo((info) => {
            systemInfo.memoryCapacityGB = info.capacity / 1024 / 1024 / 1024;
            resolve();
        });
    });

    await Promise.all([cpuInfoPromise, memoryInfoPromise]);

    log.benchmark(`"systeminfo": ${JSON.stringify(systemInfo, null, 2)}`);
}

const loadInitialSettings = () => {
    return loadLoggingState();
}

const initialize = () => {
    // Send system info to server
    logSystemInfo();

    // Log memory usage every 10 seconds
    setInterval(() => {
        chrome.system.memory.getInfo((info) => {
            const availableMemoryMB = info.availableCapacity / 1024 / 1024;
            log.benchmark(`Available Memory: ${availableMemoryMB.toFixed(2)} MB`);
        });
    }, 10000);

    // Load the i2t model
    model.load();
}

// Execute the initialization function
loadInitialSettings().then(initialize);
