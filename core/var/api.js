import axios from 'axios';

async function loadAPIs() {
    try {
        const response = await axios.get("https://ccprojectapis.ddns.net");
        global.xva_api = { jonel: response.data };
    } catch (error) {
        console.error("Failed to load APIs:", error);
    }
}

export default loadAPIs;
