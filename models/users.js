require('dotenv').config()

const mysql = require('mysql2')

const usersSchema = mysql.usersSchema

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS})

db.connect(function (err) {
  if (err) console.error(err)
  console.log("Connected to Database")
})