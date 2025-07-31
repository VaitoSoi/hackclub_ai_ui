import axios from "axios";

export default axios.create({
    baseURL: "https://ai.hackclub.com/",
    timeout: 10_000
});