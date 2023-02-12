require('dotenv').config()

const express = require('express')
const mysql = require('mysql2')
const app = express()

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS})

db.connect(function (err) {
    if (err) console.error(err)
    console.log("Connected to Database")
})

app.use(express.json())

const registrationRouter = require('./routes/registration')
app.use('/registration', registrationRouter)

app.listen(3000, () => console.log('Server Started'))