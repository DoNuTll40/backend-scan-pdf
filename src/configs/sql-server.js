
const sql = require('mssql');

const config = {
    user: 'user1',
    password: 'user@1234',
    server: '192.168.42.16',
    database: 'HMSDB',
    options: {
        encrypt: true,
        trustServerCertificate: true,
    }
};

async function connectSqlServer() {
    try {
        await sql.connect(config);
        console.log('Connected to SQL Server');
    } catch (error) {
        console.error('Error:', error);
    }
}

async function closeConnection() {
    try {
        await sql.close();
        console.log('Connection closed');
    } catch (error) {
        console.error('Error:', error);
    }
}

module.exports = { connectSqlServer, closeConnection };
