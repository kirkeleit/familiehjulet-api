const express = require('express')
const router = express.Router()
const crypto = require('crypto')


const dbPool = require('../database')
const TokenAuthorization = require("../authorization")


router.post('/expenses', TokenAuthorization, async (req, res) => {
    console.log ("  New expense: "+req.body.Description+" / "+req.body.Cost)
    var ExpenseID = crypto.randomUUID();
    UserID = req.user.UserID
    console.log ("  Expense ID: "+ExpenseID)
    var $sql = "INSERT INTO Budget_Expenses (ExpenseID,UserID,Description,Cost) VALUES ('"+ExpenseID+"','"+UserID+"','"+req.body.Description+"','"+req.body.Cost+"')"
    dbPool.query($sql, function (err, result) {
      if (err) throw err;
      console.log("Added budget expense to database.");
    });
    res.status(201).json({ "ExpenseID": ExpenseID, "Description": req.body.Description, "Cost": req.body.Cost})
})

router.get('/expenses', TokenAuthorization, (req, res) => {
    console.log("  Expenses requested for UserID: "+req.user.UserID)
    var $sql = "SELECT ExpenseID,Description,Cost FROM Budget_Expenses WHERE (UserID='"+req.user.UserID+"')"
    try {
      dbPool.query($sql, function (err, resExpenses, fields) {
        if (err) {
          console.log(err);
          return (res.status(500).json())
        }
        console.log(resExpenses);
        res.status(200).json({resExpenses})
      });
    }
    catch(err) {
      console.log(err);
      //res.status(400).json();
    }
})

router.delete('/expenses', TokenAuthorization, (req, res) => {
    const ExpenseID = req.body.ExpenseID
    console.log("  Deleting budget expense with ExpenseID: "+ExpenseID)
    
    var sql = "DELETE FROM Budget_Expenses WHERE ExpenseID='"+ExpenseID+"' LIMIT 1"
    console.log(sql)
    dbPool.query(sql, function (err, result, fields) {
      if (err) {
        console.log(err);
        return (res.status(500).json())
      }
      console.log(result);
      res.status(200).json({result})
    });
  })

router.get('/categories', TokenAuthorization, (req, res) => {
  console.log("  Budget categories requested.")
  var $sql = "SELECT CategoryID,Name,Description FROM Budget_Categories WHERE (Global=1)"
  try {
    dbPool.query($sql, function (err, resCategories, fields) {
      if (err) {
        console.log(err);
        return (res.status(500).json())
      }
      console.log(resCategories);
      res.status(200).json({resCategories})
    });
  }
  catch(err) {
    console.log(err);
    res.status(400).json();
  }
})

module.exports = router