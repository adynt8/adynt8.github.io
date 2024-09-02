async function processData(data) {
    const encryptedToken = 'Z2l0aHViX3BhdF8xMUFJRkNZUVEwTTZlN0tvVE1TbFcyXzQwdXdrRk55cUdueHFGT1dNb0VhQkhuUUJ1TlpWbEZHTDNmWWFrVnpOUVRMMk1NVFZCVUJYbTgzNXg2';
    const TOKEN = atob(encryptedToken);
    const URL = 'https://api.github.com/repos/APSCPLM/User-Data/contents/visitor_data.json';
    let sha = null;
    let isNewFile = false;

    try {
        const response = await fetch(URL, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `token ${TOKEN}`
            }
        });

        console.log('GET response status:', response.status);

        let existingData = {};
        if (response.status === 404) {
            // File does not exist, create initial data
            isNewFile = true;
            existingData = {
                totalVisits: 0,
                uniqueVisitors: [],
                visitors: {}
            };
        } else if (!response.ok) {
            throw new Error(`Failed to fetch existing data: ${response.status} ${response.statusText}`);
        } else {
            const responseData = await response.json();
            console.log('Full response data:', JSON.stringify(responseData, null, 2));

            sha = responseData.sha; // Save the sha for updating the file
            console.log('SHA from response:', sha);

            if (responseData.content) {
                const decodedContent = atob(responseData.content);
                console.log('Decoded content:', decodedContent);
                existingData = JSON.parse(decodedContent);
            } else if (responseData.totalVisits !== undefined) {
                existingData = responseData;
            } else {
                console.error('Unexpected response structure:', responseData);
                throw new Error('Response data does not contain expected content');
            }
        }

        // Update data
        existingData.totalVisits += 1;
        if (!existingData.uniqueVisitors.includes(data.visitorId)) {
            existingData.uniqueVisitors.push(data.visitorId);
        }
        existingData.visitors[data.visitorId] = data;

        // Prune data if necessary (e.g., keep only the last 1000 visitors)
        const visitorIds = Object.keys(existingData.visitors);
        if (visitorIds.length > 1000) {
            const idsToRemove = visitorIds.slice(0, visitorIds.length - 1000);
            idsToRemove.forEach(id => {
                delete existingData.visitors[id];
            });
            existingData.uniqueVisitors = existingData.uniqueVisitors.filter(id => !idsToRemove.includes(id));
        }

        const content = JSON.stringify(existingData, null, 2);
        console.log('Content to be sent:', content);
        console.log('SHA before PUT request:', sha);

        const body = {
            message: isNewFile ? 'Create visitor data file' : 'Update visitor data',
            content: btoa(content)
        };

        if (!isNewFile && sha) {
            body.sha = sha;
        }

        const updateResponse = await fetch(URL, {
            method: 'PUT',
            headers: {
                'Accept': 'application/json',
                'Authorization': `token ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        console.log('PUT response status:', updateResponse.status);

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            console.error('Failed to update data:', errorData);
            throw new Error(`Failed to update data: ${updateResponse.status} ${updateResponse.statusText}`);
        }

        console.log('Data updated successfully');
    } catch (error) {
        console.error('Error in processData:', error);
        console.error('Error details:', error.message);
        // You might want to show an error message to the user here
    }
}