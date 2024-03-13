/**
 * File Description:
 * This file contains the background script for the extension. It listens for messages
 * from the content script and sends the image URL to the server to be described.
 *
 * See the Chrome extension documentation for more information:
 * https://developer.chrome.com/docs/extensions/mv3/background_pages/
 */
// Constants
const ACTION_DESCRIBE_IMAGE = 'DESCRIBE_IMAGE';
const ACTION_LOGIN = 'LOGIN';
const ACTION_LOG = 'LOG';
const ACTION_ERROR = 'ERROR';
const SERVER_URL = 'https://i2tcapstone.azurewebsites.net';
const SERVER_DESCRIBE_PATH = "/i2t/describe";
const SERVER_LOGIN_PATH = "/users/login"
const SERVER_LOG = "/logs"
let resolveToken = () => {};
const TOKEN = new Promise((resolve) => resolveToken = resolve);

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
    } else if (message.name === ACTION_ERROR) {
        // Error logs
        logError(message.msg, message.stack);
    } else if (message.action === ACTION_DESCRIBE_IMAGE) {
        describe(message, sendResponse);
    }
    return true; // Required to keep the message channel open while waiting for the response

})

// requests server to describe
function describe(message, sendResponse) {
    getToken().then(token => {
        // Listen for messages from the content script
        log("Received request to describe image: " + message.url)

        // Send the image URL to the server to be described
        fetch(`${SERVER_URL}${SERVER_DESCRIBE_PATH}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ url: message.url }),
        })

            // Check if the server responded with an error
            .then(response => {
                if (!response.ok) {
                    console.error(`Server responded with ${response.status} ${response.statusText} for image ${message.url}`)
                    if (response.status === 422) {
                        logError("Invalid image URL: " + message.url)
                        throw new Error('Invalid image URL: ' + message.url);
                    }
                    throw new Error('Server failed to describe the image');
                }
                return response;
                // Parse the response as JSON
            }).then(response => {
            return response.json();
        })
            // Send the description back to the content script
            .then(data => {
                sendResponse({ description: data.description });
            })
            // Handle any errors that occurred during the request
            .catch(error => {
                logError("Failed to get image description: " + error)
                sendResponse({ description: error.message });
            });
    })
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
