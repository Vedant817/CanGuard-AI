import axios from "axios";

const API_URL = process.env.DEV_API_URL;

const client = axios.create({
    baseURL: API_URL,
});

export default client;