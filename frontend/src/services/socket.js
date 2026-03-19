import { io } from 'socket.io-client'

// Connect to the backend Socket.IO server via Vite proxy
const socket = io('/', {
    path: '/ws/socket.io',
    withCredentials: true,
    autoConnect: false,
    transports: ['polling', 'websocket'],
})

export default socket
