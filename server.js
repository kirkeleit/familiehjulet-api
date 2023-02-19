require('dotenv').config()

const express = require('express')
const app = express()


const dbPool = require('./database')

app.use(express.json())

const usersRouter = require('./routes/users')
app.use('/users', usersRouter)

const familiesRouter = require('./routes/families')
app.use('/families', familiesRouter)

const budgetRouter = require('./routes/budget')
app.use('/budget', budgetRouter)

app.listen(3000, () => console.log('Server Started'))