import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = 'http://localhost:3001/api';
const SOCKET_URL = 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_BASE_URL
});

export const socket = io(SOCKET_URL);
