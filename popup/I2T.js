/**
 * File Description: This file contains the JavaScript code for the popup page.
 *
 * See the Chrome extension documentation for more information:
 * https://developer.chrome.com/docs/extensions/develop/ui/add-popup
 */

/**
 * Function to send the login information to the background script.
 */
const sendLoginInfo = () => {
    const message = {
        name: 'LOGIN', username: document.getElementById('username').value,
        password: document.getElementById('password').value
    };
    console.log(JSON.stringify(message));
    chrome.runtime.sendMessage(message).then(r => console.log("FINISHED")).catch((e) => {
        console.log("CAUGHT error", e);
    });
}

// Listen for the DOM to fully load before running the script
document.addEventListener("DOMContentLoaded", () => {
    // Listen for the login button to be clicked
    document.getElementById("loginButton").addEventListener("click", sendLoginInfo);
});
