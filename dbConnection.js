var mysql = require('mysql');
const util = require("util"); 
require('dotenv').config();

var conn = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    port: process.env.MYSQL_PORT,
    database: process.env.MYSQL_DBNAME
});
conn.query = util.promisify(conn.query).bind(conn);

conn.connect(function (err) {
    if (err) throw err;
    console.log('Database is connected successfully !');
});
module.exports = conn;