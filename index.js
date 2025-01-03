
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { wss } = require('./src/middlewares/websocket')

const web = express();


const port = process.env.PORT
const pdfRoute = require('./src/routes/pdf-route');
const authRoute = require('./src/routes/auth-route');
const errorHandler = require('./src/middlewares/error');
const notFoundHandler = require('./src/middlewares/notFound');
const diskRoute = require('./src/routes/disk-route');

web.use(cors("*"))
web.use(express.json())

web.use('/api', authRoute)
web.use('/api', pdfRoute);
web.use('/api', authRoute, diskRoute)

const server = http.createServer(web);

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

server.listen(port, () => {
    console.log(`\nServer run on port ${port} | URL : http://localhost:${port} \n`);
})

web.use(errorHandler)
web.use('*', notFoundHandler)
