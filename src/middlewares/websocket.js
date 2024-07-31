
const WebSocket = require('ws');

const wss = new WebSocket.Server({ noServer: true });
const notifications = []; // Array to store notifications with timestamps

let clients = 0;

wss.on('connection', (ws) => {
    
    clients++
    console.log('client connected. Total clients:', clients);

    // Send all recent notifications to the new client
    const now = Date.now();
    const recentNotifications = notifications.filter(notification => (now - notification.timestamp) < 86400000); // Last 24 hours
    recentNotifications.forEach(notification => {
        ws.send(JSON.stringify(notification));
    });

    ws.on('close', () => {
        clients--;
        console.log('Client disconnected. Total clients:', clients);
    });
});

function notifyClients(message) {
    const notification = {
        message,
        timestamp: Date.now() // Add timestamp to notification
    };
    notifications.push(notification);
    
    // Remove notifications older than 24 hours (86400000 milliseconds)
    const now = Date.now();
    while (notifications.length > 0 && (now - notifications[0].timestamp) >= 86400000) {
        notifications.shift();
    }
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(notification));
        }
    });
}

module.exports = { wss, notifyClients };