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
const SERVER_FEEDBACK = '/i2t/feedback'
const ACTION_FEEDBACK1 = 'feedback1'
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

// Temporary alt text measure
function clickMenuCallback(info, tab) {
    const message = { action: 'IMAGE_CLICKED', url: info.srcUrl };
    chrome.tabs.sendMessage(tab.id, message);
}


// Temporary alt text display until I figure out the key binds
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'contextMenu0',
        title: 'Show alt text ',
        contexts: ['image'],
    });
});

chrome.contextMenus.onClicked.addListener(clickMenuCallback);

// Listen for key bindings
chrome.commands.onCommand.addListener((command) => {
    if (command === ACTION_FEEDBACK1) {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, {action: "captureImage"}).then(r => {
                    console.log(r)
                    if (r.imageUrl != null) {
                        console.log(r.imageUrl)
                        feedback('1', r.imageUrl)
                    }
                    console.log(r.imageUrl)
                });
        });
    }
});

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

// logs feedback
function feedback(msg, link) {
    console.log(msg + " : " + link);
    getToken().then(async token => {
        const logMessage = {
            score: msg,
            hashed_page_url: await crypto.subtle.digest('MD5', link),
            timestamp: new Date,
            image_url: link
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

        fetch(`${SERVER_URL}${SERVER_FEEDBACK}`, options)
            .catch(err => console.error(err));
    })
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
    console.error(msg);
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
