import axios from "axios";

export default axios.create({
    baseURL: process.env.UI_BACKEND || "http://localhost:8000",
    timeout: 60_000
});