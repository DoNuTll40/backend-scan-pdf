
const createError = require("../utils/create-error");
const jwt = require('jsonwebtoken')
const sql = require("mssql");
const { connectSqlServer, closeConnection } = require("../configs/sql-server");
const crypto = require('crypto-js')
const fs = require('fs')

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return createError(400, "username or password invalid");
    }

    if (typeof username !== "string" || typeof password !== "string") {
      return createError(400, "username or password invalid");
    }

    const encodeStringToHex = (str) => {
        let hex = '';
        for (let i = 0; i < str.length; i++) {
            hex += (str.charCodeAt(i) + 15).toString(16).toUpperCase();
        }
        return hex;
    }

    const hashPassword = encodeStringToHex(password)

    const hashUsername = encodeStringToHex(username)

    // await connectSqlServer();

    // const responese = await sql.query `SELECT RTRIM([ofctitle]) + ' ' + RTRIM([ofcfname]) + ' ' + RTRIM([ofclname]) AS fullname, 
    // RTRIM(officer.ofctitle) AS prefix, RTRIM(officer.ofcfname) AS fname, RTRIM(officer.ofclname) AS lname, 
    // RTRIM(officer.ofcgroup) AS officeCode, RTRIM(officergroup.ofcgtyp) AS officeName, officer.OFCGR AS position 
    // FROM officer 
    // INNER JOIN UserProfile ON officer.ofcid = UserProfile.OficeID 
    // INNER JOIN officergroup ON officer.ofcgroup = officergroup.ofcgid
    // WHERE RUsername = ${hashUsername} AND RPassword = ${hashPassword} AND officergroup.ofcgtyp like 'พัสดุ%'`

    // await closeConnection();

    // if(responese.rowsAffected[0] === 0) {
    //     return next(createError(400, "ไม่พบผู้ใช้งานในระบบ"))
    // }

    fs.readFile('login.json', 'utf8', (err, data) => {
      if (err) {
        return createError(500, "Error reading users file")
      }
  
      const users = JSON.parse(data);
      const response = users.find(user => user.username === hashUsername && user.password === hashPassword);

      if(!response){
        return createError(400, "ไม่พบผูใช้งานในระบบ")
      }

      const { username, password, ...userData} = response;
      if (userData) {
        const token = jwt.sign(
          { data: [userData] }, process.env.JWT_SECRET, {
              expiresIn: process.env.JWT_EXPIRES_IN
          }
      )
        res.json({ message: "Login Success!" ,token})
      } else {
        return createError(401, "Invalid username or password")
      }
    });

    // // remove 1 record
    // const {recordsets, ...data_api} = responese

    // // generate token
    // const token = jwt.sign(
    //     { data: data_api.recordset }, process.env.JWT_SECRET, {
    //         expiresIn: process.env.JWT_EXPIRES_IN
    //     }
    // )

    // res.json({ message: "Login Success!" ,token})

  } catch (err) {
    next(err);
    console.log(err);
  }
};

exports.getMe = (req, res, next) => {
    res.json(req.user);
};


