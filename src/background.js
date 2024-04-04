/**
 * File Description:
 * This file contains the background script for the extension. It listens for messages
 * from the content script and sends the image URL to the server to be described.
 *
 * See the Chrome extension documentation for more information:
 * https://developer.chrome.com/docs/extensions/mv3/background_pages/
 */

import I2TModelXS from './i2t-model-xs.js';

// Constants
const ACTION_DESCRIBE_IMAGE = 'DESCRIBE_IMAGE';
const ACTION_LOGIN = 'LOGIN';
const ACTION_LOG = 'LOG';
const ACTION_ERROR = 'ERROR';
const SERVER_URL = 'https://i2tcapstone.azurewebsites.net';
const SERVER_LOGIN_PATH = "/users/login"
const SERVER_LOG = "/logs"
let resolveToken = () => {};
const TOKEN = new Promise((resolve) => resolveToken = resolve);

// Load the i2t model
const model = new I2TModelXS();

// Gets access token from storage
function getToken() {
    return chrome.storage.sync.get("token").then((response) => {
        if (response.value) {
            return response.value;
        } else {
            return TOKEN;
        }
    })
}

// Listen for login button
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.name === ACTION_LOGIN) {
        // Acquire access token
        login(message.username, message.password);
    } else if (message.name === ACTION_LOG) {
        // Logs message
        log(message.msg);
        return false; // Indicate synchronous response
    } else if (message.name === ACTION_ERROR) {
        // Error logs
        logError(message.msg, message.stack);
        return false; // Indicate synchronous response
    } else if (message.action === ACTION_DESCRIBE_IMAGE) {
        describe(message, sendResponse);
    }
    return true; // Indicate asynchronous response
})

// request i2t model to describe
function describe(message, sendResponse) {
    if (!message.height || !message.width || !message.rawImageData) {
        logError("Invalid image data");
        return;
    }
    log(`Received image to describe: ${message.url}`)

    // Convert raw image data to ImageData
    const imageData = new ImageData(
        Uint8ClampedArray.from(message.rawImageData), message.width, message.height);

    // Request the i2t model to describe the image
    model.describeImage(imageData, message.url).then((desription) => {
        sendResponse({ description: desription });
    }).catch((err) => {
        logError(err);
        sendResponse({ description: "An error occurred while describing the image." });
    });
}

// Gets access token
function login(user, pass) {
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
            resolveToken(response.access_token);
            chrome.storage.sync.set({token: {value: response.access_token}});
        })
        .catch(err => console.error(err));
}

function log(msg) {
    console.log(msg);
    getToken().then(token => {
        const logMessage = {
            message: msg,
            level: {label: "info", value: 2},
            logger: "client",
            timestamp: new Date().toISOString(),
            stacktrace: ""
        }

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                logs: [logMessage],
                count: 1
            })
        };

        fetch(`${SERVER_URL}${SERVER_LOG}`, options)
            .catch(err => console.error(err));
    })
}

// Error logging function
function logError(msg, sta) {
    console.error(msg, sta);
    getToken().then(token => {
        const stack = sta ?? new Error().stack;
        const logMessage = {
            message: msg,
            level: {label: "error", value: 4},
            logger: "client",
            timestamp: new Date().toISOString(),
            stacktrace: stack
        }

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                logs: [logMessage],
                count: 1
            })
        };

        fetch(`${SERVER_URL}${SERVER_LOG}`, options)
            .catch(err => console.error(err));
    })
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

    log(`"systeminfo": ${JSON.stringify(systemInfo, null, 2)}`);
}

// Send system info to server
logSystemInfo();

// Log memory usage every 10 seconds
setInterval(() => {
    chrome.system.memory.getInfo((info) => {
        const availableMemoryMB = info.availableCapacity / 1024 / 1024;
        log(`Available Memory: ${availableMemoryMB.toFixed(2)} MB`);
    });
}, 10000);
