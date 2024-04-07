// Function to save the selected options
const saveOptions = () => {
    const selectedPriority = document.querySelector('input[name="priority"]:checked').value;
    const loggingEnabled = document.getElementById('loggingToggle').checked;
    const altTextEnabled = document.getElementById('altTextToggle').checked;
    chrome.storage.sync.set({priority: selectedPriority, logging: loggingEnabled, altText: altTextEnabled}, () => {
        // Announce the save confirmation to screen readers
        const status = document.getElementById('status');
        status.textContent = 'Settings saved. Performance: ' + selectedPriority + ', Logging: ' + (loggingEnabled ? 'Enabled' : 'Disabled') + ', Alt-Text Display: ' + (altTextEnabled ? 'Enabled' : 'Disabled') + '.';
        status.style.visibility = 'visible';
        setTimeout(() => status.style.visibility = 'hidden', 4000);
    });
}

// Function to restore the selected options on page load
const restoreOptions = () => {
    chrome.storage.sync.get(['priority', 'logging', 'altText'], (result) => {
        if(result.priority) {
            document.getElementById(result.priority.toLowerCase()).checked = true;
        }
        document.getElementById('loggingToggle').checked = result.logging || false;
        document.getElementById('altTextToggle').checked = result.altText || false;
    });
}

// Add event listeners to the save button and the page load
document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
