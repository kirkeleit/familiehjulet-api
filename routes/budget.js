const express = require('express')
const router = express.Router()
const crypto = require('crypto')

const dbPool = require('../database')
const TokenAuthorization = require("../authorization")

router.post('/', TokenAuthorization, async (req, res) => {
    console.log ("  New expense: "+req.body.Description+" / "+req.body.Cost)
    var ExpenseID = crypto.randomUUID();
    UserID = "test"
    console.log ("  Expense ID: "+ExpenseID)
    var $sql = "INSERT INTO Budget_Expenses (ExpenseID,UserID,Description,Cost) VALUES ('"+ExpenseID+"','"+UserID+"','"+req.body.Description+"','"+req.body.Cost+"')"
    dbPool.query($sql, function (err, result) {
      if (err) throw err;
      console.log("Added budget expense to database.");
    });
    res.status(201).json({ "ExpenseID": ExpenseID})
})

module.exports = router