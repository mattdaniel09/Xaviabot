import axios from "axios";

const endpoints = {
    jonel: "https://ccprojectapis.ddns.net",
    josh: "https://joshweb.click"
};

/**
 * Fetch data from a specific endpoint.
 * @param {string} apiName - The name of the endpoint to use ('jonel' or 'josh').
 * @param {string} path - The specific path to append to the endpoint.
 * @param {object} params - Optional query parameters to include in the request.
 * @returns {Promise<object>} - The response data from the API.
 */
async function fetchFromEndpoint(apiName, path, params = {}) {
    try {
        const url = `${endpoints[apiName]}${path}`;
        const response = await axios.get(url, { params });
        return response.data;
    } catch (error) {
        console.error(`Error fetching from ${apiName} endpoint:`, error);
        throw error;
    }
}

export { fetchFromEndpoint, endpoints };

