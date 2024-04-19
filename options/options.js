const priorityToModelSizeMap = {
    'Efficiency': 'xs',
    'Quality': 'l'
}

const modelSizeToPriorityMap = {
    'xs': 'Efficiency',
    'l': 'Quality'
}

const priorityToModelSize = (priority) => {
    const modelSize = priorityToModelSizeMap[priority];
    if (!modelSize) {
        console.error(`Priority not implemented: ${priority}`);
    }
    return modelSize;
}

const modelSizeToPriority = (modelSize) => {
    const priority = modelSizeToPriorityMap[modelSize];
    if (!priority) {
        console.error(`Model size not implemented: ${modelSize}`);
    }
    return priority;
}

// Function to save the selected options
const saveOptions = () => {
    const priority = document.querySelector('#performanceForm input[name="priority"]:checked').value;
    const modelSize = priorityToModelSize(priority);
    const loggingEnabled = document.getElementById('loggingToggle').checked;
    const altTextEnabled = document.getElementById('altTextToggle').checked;
    chrome.storage.sync.set({modelSize: modelSize, logging: loggingEnabled, altText: altTextEnabled}, () => {
        // Announce the save confirmation to screen readers
        const status = document.getElementById('status');
        status.textContent = `Settings saved. Priority: ${priority}, Logging: ${loggingEnabled ? 'Enabled' : 'Disabled'}, Alt Text Display: ${altTextEnabled ? 'Enabled' : 'Disabled'}.`;
        status.style.visibility = 'visible';
        setTimeout(() => status.style.visibility = 'hidden', 4000);
    });
}

// Function to restore the selected options on page load
const restoreOptions = () => {
    chrome.storage.sync.get(['modelSize', 'logging', 'altText'], (result) => {
        if (result.modelSize) {
            const priority = modelSizeToPriority(result.modelSize);
            document.getElementById(priority.toLowerCase()).checked = true;
        } else {
            document.getElementById('efficiency').checked = true;
        }
        document.getElementById('loggingToggle').checked = result.logging || false;
        document.getElementById('altTextToggle').checked = result.altText || false;
    });
}

// Add event listeners to the save button and the page load
document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
