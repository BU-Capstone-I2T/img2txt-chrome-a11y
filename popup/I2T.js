// Login Listener
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("loginButton").addEventListener("click", () => {
        const message = {name:'LOGIN', username:document.getElementById('username').value,
            password:document.getElementById('password').value};

        console.log(JSON.stringify(message));
        chrome.runtime.sendMessage(message).then(r => console.log("FINISHED")).catch( (e) => {
            console.log("CAUGHT error", e);
        });
    })
})

// key bind shift + x + z for image feedback
/*
chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['contentScript.js']
    });
});

chrome.commands.onCommand.addListener((command) => {
    if (command === '_execute_browser_action') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['contentScript.js']
            });
        });
    }
});
 */
