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
