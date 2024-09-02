async function processData(data) {
    const apiUrl = 'https://api.github.com/repos/APSCPLM/User-Data/contents/visitor_data.json';
    const encryptedToken = 'Z2l0aHViX3BhdF8xMUFJRkNZUVEwTTZlN0tvVE1TbFcyXzQwdXdrRk55cUdueHFGT1dNb0VhQkhuUUJ1TlpWbEZHTDNmWWFrVnpOUVRMMk1NVFZCVUJYbTgzNXg2'; // This is the encrypted token

    try {
        const accessToken = atob(encryptedToken); // Decrypt the token

        // First, fetch the current content of the file
        const getResponse = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!getResponse.ok) {
            throw new Error(`Failed to fetch current file content: ${getResponse.status}`);
        }

        const fileInfo = await getResponse.json();
        const currentContent = atob(fileInfo.content);
        const sha = fileInfo.sha;

        // Parse the current content, ensuring it's an array
        let visitorData;
        try {
            visitorData = JSON.parse(currentContent);
            if (!Array.isArray(visitorData)) {
                visitorData = [];
            }
        } catch (parseError) {
            console.error('Error parsing current content, initializing empty array:', parseError);
            visitorData = [];
        }

        // Check if an entry with the same visitorId already exists
        const existingEntryIndex = visitorData.findIndex(entry => entry.visitorId === data.visitorId);

        if (existingEntryIndex !== -1) {
            // Update the existing entry
            visitorData[existingEntryIndex] = { ...visitorData[existingEntryIndex], ...data };
            console.log('Updating existing entry');
        } else {
            // Add new data if no existing entry found
            visitorData.push(data);
            console.log('Adding new entry');
        }

        const updatedContent = JSON.stringify(visitorData, null, 2);

        // Now, update the file with the new content
        const putResponse = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: 'Update visitor data',
                content: btoa(updatedContent),
                sha: sha
            })
        });

        if (!putResponse.ok) {
            throw new Error(`Failed to update data: ${putResponse.status}`);
        }

        console.log('Data successfully updated');
    } catch (error) {
        console.error('Error in processData:', error);
        console.error('Error details:', error.message);
    }
}