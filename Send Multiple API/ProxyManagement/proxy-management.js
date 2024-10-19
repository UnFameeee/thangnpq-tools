$(document).ready(function() {
    // Load current configuration
    $.get('/api/proxy-config', function(data) {
        $('#target').val(data.target);
        $('#publicApiKey').val(data.publicApiKey);
        updatePublicApiEndpoint();
    });

    // Save configuration
    $('#proxyConfigForm').submit(function(e) {
        e.preventDefault();
        const config = {
            target: $('#target').val(),
            apiKey: $('#apiKey').val(),
            publicApiKey: $('#publicApiKey').val()
        };
        $.post('/api/proxy-config', config, function() {
            alert('Proxy configuration updated successfully');
            $('#apiKey').val('');  // Clear API key for security
            updatePublicApiEndpoint();
        });
    });

    // Copy public API endpoint
    $('#copyEndpoint').click(function() {
        const endpoint = $('#publicApiEndpoint').text();
        navigator.clipboard.writeText(endpoint).then(function() {
            alert('Public API endpoint copied to clipboard');
        });
    });

    function updatePublicApiEndpoint() {
        const host = window.location.host;
        const publicApiKey = $('#publicApiKey').val();
        const endpoint = `http://${host}/proxy?key=${publicApiKey}`;
        $('#publicApiEndpoint').text(endpoint);
    }
});
