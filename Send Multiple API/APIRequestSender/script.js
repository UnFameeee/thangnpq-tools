let requestCount = 0;
let currentFileName = 'default';
let jsonEditors = {};
let autoScrollToResponse = true;
let hasUnsavedChanges = false;
let responseCount = 0;

function markUnsavedChanges() {
    hasUnsavedChanges = true;
}

function showNotification(message, type = 'info') {
    const notification = $('<div>')
        .addClass(`notification ${type}`)
        .text(message)
        .appendTo('body');

    setTimeout(() => {
        notification.fadeOut(300, function() { $(this).remove(); });
    }, 3000);
}

function addRequestBlock(savedData = null) {
    requestCount++;
    const container = document.getElementById('requestContainer');
    const block = document.createElement('div');
    block.className = 'requestBlock';
    block.id = `requestBlock${requestCount}`;
    const defaultName = `Request ${requestCount}`;
    block.innerHTML = `
        <div class="request-header">
            <span class="order-status">${requestCount}</span>
            <input type="text" id="name${requestCount}" class="requestName" placeholder="${defaultName}" value="${savedData ? savedData.name : ''}">
            <button onclick="toggleCollapse(${requestCount})" class="collapseButton"><i class="fas fa-chevron-up"></i></button>
        </div>
        <div class="request-content" id="requestContent${requestCount}">
            <label>Endpoint:</label>
            <input type="text" id="endpoint${requestCount}" placeholder="https://api.example.com/endpoint" value="${savedData ? savedData.endpoint : ''}">
            <br>
            <label>Method:</label>
            <select id="method${requestCount}">
                <option value="GET" ${savedData && savedData.method === 'GET' ? 'selected' : ''}>GET</option>
                <option value="POST" ${savedData && savedData.method === 'POST' ? 'selected' : ''}>POST</option>
                <option value="PUT" ${savedData && savedData.method === 'PUT' ? 'selected' : ''}>PUT</option>
                <option value="DELETE" ${savedData && savedData.method === 'DELETE' ? 'selected' : ''}>DELETE</option>
            </select>
            <br>
            <label>Headers:</label>
            <div class="headers-container" id="headersContainer${requestCount}">
                <div class="header-row">
                    <input type="text" class="header-key" placeholder="Key">
                    <input type="text" class="header-value" placeholder="Value">
                    <button class="remove-header" onclick="removeHeaderRow(this)">-</button>
                </div>
            </div>
            <button class="add-header" onclick="addHeaderRow(${requestCount})">+ Add Header</button>
            <br>
            <label>Body:</label>
            <div id="jsoneditor${requestCount}" style="height: 400px;"></div>
        </div>
        <div class="request-actions">
            <button onclick="sendRequest(${requestCount})" class="sendButton" id="sendButton${requestCount}"><i class="fas fa-paper-plane"></i> Send Request</button>
            <button onclick="removeRequestBlock(${requestCount})" class="removeButton"><i class="fas fa-trash"></i> Remove</button>
            <button onclick="toggleLock(${requestCount})" class="lockButton" id="lockButton${requestCount}"><i class="fas fa-lock"></i> Lock</button>
            <button onclick="toggleDisable(${requestCount})" class="disableButton" id="disableButton${requestCount}"><i class="fas fa-power-off"></i> Disable</button>
        </div>
    `;
    container.appendChild(block);

    // Add change event listeners to inputs
    block.querySelectorAll('input, select, textarea').forEach(element => {
        element.addEventListener('change', markUnsavedChanges);
    });

    // Initialize JSONEditor
    const jsonEditorContainer = document.getElementById(`jsoneditor${requestCount}`);
    const options = {
        mode: 'code',
        modes: ['code', 'form', 'text', 'tree', 'view'],
        onChangeJSON: markUnsavedChanges
    };
    jsonEditors[requestCount] = new JSONEditor(jsonEditorContainer, options);

    if (savedData) {
        if (savedData.body) {
            try {
                jsonEditors[requestCount].set(JSON.parse(savedData.body));
            } catch (e) {
                jsonEditors[requestCount].set({});
            }
        }
        if (savedData.locked) {
            toggleLock(requestCount);
        }
        if (savedData.disabled) {
            toggleDisable(requestCount);
        }
        if (savedData.headers) {
            loadHeaders(requestCount, savedData.headers);
        }
        if (savedData.collapsed) {
            toggleCollapse(requestCount);
        }
    }
}

function updateDataSelector(newFileName = null) {
    $.ajax({
        url: '/list-files',
        type: 'GET',
        success: function(files) {
            const dataSelector = $('#dataSelector');
            dataSelector.empty();
            if (newFileName) {
                files.push(newFileName);
            }
            files.sort();
            files.forEach(file => {
                dataSelector.append($('<option>', {
                    value: file,
                    text: file
                }));
            });
            if (files.length > 0) {
                currentFileName = newFileName || files[0];
                dataSelector.val(currentFileName);
                if (!newFileName) {
                    loadFromFile(currentFileName);
                }
            } else {
                addRequestBlock();
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error('Error listing files:', textStatus, errorThrown);
            addRequestBlock();
        }
    });
}

function createNewFile() {
    const newFileName = prompt("Enter a name for the new file (without .json extension):");
    if (newFileName) {
        currentFileName = newFileName + '.json'; // Add .json extension
        // Clear existing requests
        document.getElementById('requestContainer').innerHTML = '';
        requestCount = 0;
        // Add a default empty request block
        addRequestBlock();
        // Update the data selector
        updateDataSelector(currentFileName);
        // Save the new empty file
        saveToFile();
    }
}

function loadFromFile(filename) {
    $.ajax({
        url: '/load-data',
        type: 'GET',
        data: { filename },
        dataType: 'json',
        success: function(savedData) {
            console.log('Received data:', savedData);
            if (savedData && Array.isArray(savedData) && savedData.length > 0) {
                document.getElementById('requestContainer').innerHTML = '';
                requestCount = 0;
                savedData.forEach(request => addRequestBlock(request));
                hasUnsavedChanges = false;
            } else {
                console.log('No valid data found in the selected file.');
                addRequestBlock();
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error('Error loading data:', textStatus, errorThrown);
            console.log('Response Text:', jqXHR.responseText);
            showNotification('Error loading file. Check console for details.', 'error');
            addRequestBlock();
        }
    });
}

function lockAll() {
    document.querySelectorAll('.lockButton').forEach(button => {
        if (!button.classList.contains('locked')) {
            button.click(); // This will trigger the toggleLock function
        }
    });
}

function toggleLock(id) {
    const inputs = document.querySelectorAll(`#requestBlock${id} input, #requestBlock${id} select, #requestBlock${id} textarea`);
    const lockButton = document.getElementById(`lockButton${id}`);
    const isLocked = lockButton.classList.contains('locked');

    inputs.forEach(input => {
        input.disabled = !isLocked; // Disable inputs if locked
    });

    if (isLocked) {
        lockButton.innerHTML = '<i class="fas fa-lock"></i> Lock';
        lockButton.classList.remove('locked');
    } else {
        lockButton.innerHTML = '<i class="fas fa-unlock"></i> Unlock';
        lockButton.classList.add('locked');
    }
    markUnsavedChanges(); // Optional: Save state if needed
}

function sendAllRequests() {
    const groupId = Date.now(); // Use timestamp as group ID
    const requests = document.querySelectorAll('.requestBlock:not(.disabled)');
    requests.forEach((request, index) => {
        const id = request.id.replace('requestBlock', '');
        setTimeout(() => sendRequest(id, groupId), index * 100); // Send requests with a delay
    });
}

function sendRequest(id, groupId = null) {
    const button = document.getElementById(`sendButton${id}`);
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    button.disabled = true;

    const endpoint = document.getElementById(`endpoint${id}`).value;
    const method = document.getElementById(`method${id}`).value;
    let headers = getHeadersFromInputs(id);
    let body = jsonEditors[id].get();

    $.ajax({
        url: '/api-proxy',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            url: endpoint,
            method: method,
            headers: headers,
            data: body
        }),
        success: function(data, textStatus, jqXHR) {
            displayResponse(id, {
                status: jqXHR.status,
                statusText: jqXHR.statusText,
                data: data
            }, groupId);
            resetButton(button);
        },
        error: function(jqXHR, textStatus, errorThrown) {
            displayResponse(id, {
                status: jqXHR.status,
                statusText: jqXHR.statusText,
                error: errorThrown
            }, groupId);
            resetButton(button);
        }
    });
}

function clearResponses() {
    const responseContainer = document.getElementById('responseContainer');
    responseContainer.innerHTML = ''; // Clear the content of the response container
}

function loadHeaders(id, headers) {
    const container = document.getElementById(`headersContainer${id}`);
    container.innerHTML = ''; // Clear existing headers
    Object.entries(headers).forEach(([key, value]) => {
        const row = document.createElement('div');
        row.className = 'header-row';
        row.innerHTML = `
            <input type="text" class="header-key" value="${key}" placeholder="Key">
            <input type="text" class="header-value" value="${value}" placeholder="Value">
            <button class="remove-header" onclick="removeHeaderRow(this)">-</button>
        `;
        container.appendChild(row);
    });
}

function toggleAutoScroll() {
    autoScrollToResponse = !autoScrollToResponse; // Toggle the auto-scroll state
    const autoScrollCheckbox = document.getElementById('autoScrollCheckbox');
    autoScrollCheckbox.checked = autoScrollToResponse; // Update the checkbox state
    localStorage.setItem('autoScrollToResponse', autoScrollToResponse.toString()); // Save preference
}

function toggleCollapse(id) {
    const content = document.getElementById(`requestContent${id}`);
    const button = document.querySelector(`#requestBlock${id} .collapseButton i`);
    if (content.style.display === "none") {
        content.style.display = "block"; // Show the content
        button.className = "fas fa-chevron-up"; // Change button icon
    } else {
        content.style.display = "none"; // Hide the content
        button.className = "fas fa-chevron-down"; // Change button icon
    }
    markUnsavedChanges(); // Optional: Save state if needed
}

function saveToFile() {
    const requests = document.querySelectorAll('.requestBlock');
    const savedData = Array.from(requests).map(request => {
        const id = request.id.replace('requestBlock', '');
        return getRequestData(id);
    });

    $.ajax({
        url: '/api/save-data',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ filename: currentFileName, data: savedData }),
        success: function(response) {
            showNotification('Data saved successfully!', 'success');
            hasUnsavedChanges = false;
        },
        error: function(jqXHR, textStatus, errorThrown) {
            showNotification('Error saving data: ' + errorThrown, 'error');
        }
    });
}

function getRequestData(id) {
    const content = document.getElementById(`requestContent${id}`);
    return {
        name: document.getElementById(`name${id}`).value,
        endpoint: document.getElementById(`endpoint${id}`).value,
        method: document.getElementById(`method${id}`).value,
        headers: getHeadersFromInputs(id), // Ensure this function returns the correct headers
        body: JSON.stringify(jsonEditors[id].get()), // Ensure this is valid JSON
        locked: document.getElementById(`lockButton${id}`).classList.contains('locked'),
        disabled: document.getElementById(`requestBlock${id}`).classList.contains('disabled'),
        collapsed: content.style.display === "none"
    };
}

function getHeadersFromInputs(id) {
    const headerRows = document.querySelectorAll(`#headersContainer${id} .header-row`);
    const headers = {};
    headerRows.forEach(row => {
        const key = row.querySelector('.header-key').value;
        const value = row.querySelector('.header-value').value;
        if (key && value) {
            headers[key] = value; // Add the header to the object if both key and value are present
        }
    });
    return headers; // Return the headers object
}

function displayResponse(id, response, groupId = null) {
    const responseContainer = document.getElementById('responseContainer');
    const responseElement = document.createElement('div');
    responseElement.className = 'response-block';
    
    // Generate a random color for the group
    const randomColor = getRandomColor();
    
    if (groupId) {
        responseElement.classList.add(`group-${groupId}`);
        // Add a group header if it's the first in the group
        if (!document.querySelector(`.group-${groupId}`)) {
            const groupHeader = document.createElement('div');
            groupHeader.className = 'group-header';
            groupHeader.textContent = `Group ${groupId}`;
            groupHeader.style.backgroundColor = randomColor;
            responseContainer.insertBefore(groupHeader, responseContainer.firstChild);
        }
    }
    
    const requestName = document.getElementById(`name${id}`).value || `Request ${id}`;
    const timestamp = new Date().toLocaleString();
    responseElement.innerHTML = `
        <div class="response-header">
            <span class="response-order">${id}</span>
            <h3>Response for ${requestName}</h3>
        </div>
        <p>Timestamp: ${timestamp}</p>
        <pre>${JSON.stringify(response, null, 2)}</pre>
    `;
    responseContainer.insertBefore(responseElement, responseContainer.firstChild);

    if (autoScrollToResponse) {
        responseElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function resetButton(button) {
    button.innerHTML = '<i class="fas fa-paper-plane"></i> Send Request';
    button.disabled = false;
}

function toggleDisable(id) {
    const requestBlock = document.getElementById(`requestBlock${id}`);
    const disableButton = document.getElementById(`disableButton${id}`);
    const inputs = requestBlock.querySelectorAll('input, select, textarea, button:not(.disableButton)');
    
    if (requestBlock.classList.contains('disabled')) {
        requestBlock.classList.remove('disabled');
        disableButton.innerHTML = '<i class="fas fa-power-off"></i> Disable';
        inputs.forEach(input => input.disabled = false);
    } else {
        requestBlock.classList.add('disabled');
        disableButton.innerHTML = '<i class="fas fa-power-off"></i> Enable';
        inputs.forEach(input => input.disabled = true);
    }
    
    markUnsavedChanges();
}

function addHeaderRow(id) {
    const container = document.getElementById(`headersContainer${id}`);
    const row = document.createElement('div');
    row.className = 'header-row';
    row.innerHTML = `
        <input type="text" class="header-key" placeholder="Key">
        <input type="text" class="header-value" placeholder="Value">
        <button class="remove-header" onclick="removeHeaderRow(this)">-</button>
    `;
    container.appendChild(row);
    markUnsavedChanges();
}

function removeHeaderRow(button) {
    const row = button.closest('.header-row');
    row.remove();
    markUnsavedChanges();
}

$(document).ready(function() {
    updateDataSelector();

    $('#dataSelector').change(function() {
        currentFileName = $(this).val();
        loadFromFile(currentFileName);
    });

    $('#saveButton').click(function() {
        saveToFile();
    });

    $('#newFileButton').click(createNewFile); // Ensure this function is defined

    // Add buttons to the UI
    const buttonContainer = $('.top-buttons');
    
    const addButton = $('<button>')
        .html('<i class="fas fa-plus"></i> Add New Request')
        .addClass('add-button')
        .click(() => addRequestBlock());
    
    const lockAllButton = $('<button>')
        .html('<i class="fas fa-lock"></i> Lock All')
        .addClass('all-button lock-all-button')
        .click(lockAll); // Ensure this function is defined
    
    const sendAllButton = $('<button>')
        .html('<i class="fas fa-paper-plane"></i> Send All')
        .addClass('all-button send-all-button')
        .attr('id', 'sendAllButton')
        .click(sendAllRequests); // Ensure this function is defined
    
    const clearButton = $('<button>')
        .html('<i class="fas fa-trash-alt"></i> Clear Responses')
        .addClass('all-button clear-button')
        .click(clearResponses); // Ensure this function is defined
    
    buttonContainer.append(addButton, lockAllButton, sendAllButton, clearButton);

    // Update save button class
    $('#saveButton').addClass('save-button');

    // Update new file button
    $('#newFileButton').html('<i class="fas fa-file-plus"></i> New File');

    const autoScrollLabel = $('<label>')
        .addClass('auto-scroll-label')
        .append($('<input>')
            .attr('type', 'checkbox')
            .attr('id', 'autoScrollCheckbox')
            .change(toggleAutoScroll) // Call toggleAutoScroll when checkbox changes
        )
        .append(' Auto-scroll to new responses');

    $('#rightPanel h2').after(autoScrollLabel);

    // Load the auto-scroll preference, default to true if not set
    autoScrollToResponse = localStorage.getItem('autoScrollToResponse') !== 'false';
    const autoScrollCheckbox = document.getElementById('autoScrollCheckbox');
    autoScrollCheckbox.checked = autoScrollToResponse;

    // Prompt user on tab close if there are unsaved changes
    window.addEventListener('beforeunload', function (e) {
        if (hasUnsavedChanges) {
            const confirmationMessage = 'You have unsaved changes. Do you really want to leave?';
            e.returnValue = confirmationMessage;
            return confirmationMessage;
        }
    });
});
