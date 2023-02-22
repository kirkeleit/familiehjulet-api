const express = require('express')
const router = express.Router()
const crypto = require('crypto')

const dbPool = require('../database')
const TokenAuthorization = require("../authorization")

router.get('/', TokenAuthorization, (req, res) => {
  console.log("  Family list requested by UserID: "+req.body.UserID)
  var $sql = "SELECT f.FamilyID,f.Name,f.DateCreated,x.ACL FROM Families f LEFT JOIN Families_X_Users x ON (f.FamilyID=x.FamilyID) WHERE (x.UserID='"+req.body.UserID+"')"
  try {
    dbPool.query($sql, function (err, result, fields) {
      if (err) {
        console.log(err);
        return (res.status(500).json())
      }
      console.log(result);
      res.status(200).json({result})
    });
  }
  catch(err) {
    console.log(err);
    res.status(400).json()
  }
})

router.get('/:id', TokenAuthorization, (req, res) => {
  console.log("  Family requested for "+req.params.id+" by "+req.body.UserID)
  var $sql = "SELECT f.FamilyID,f.Name,f.DateCreated,x.ACL FROM Families f LEFT JOIN Families_X_Users x ON (f.FamilyID=x.FamilyID) WHERE (f.FamilyID='"+req.params.id+"') AND (x.UserID='"+req.body.UserID+"') LIMIT 1"
  try {
    dbPool.query($sql, function (err, result, fields) {
      if (err) {
        console.log(err);
        return (res.status(500).json())
      }
      console.log(result);
      res.status(200).json({result})
    });
  }
  catch(err) {
    console.log(err);
    res.status(400).json()
  }
})

router.post('/', TokenAuthorization, async (req, res) => {
    console.log("  Requested to create new family:")
    console.log("    Name: "+req.body.Name)
    var FamilyID = crypto.randomUUID();
    console.log("    FamilyID: "+FamilyID)
    var UserID = req.user.UserID;
    console.log("    UserID: "+UserID)
    var $sql = "INSERT INTO Families (FamilyID,Name) VALUES ('"+FamilyID+"','"+req.body.Name+"')"
    dbPool.query($sql, function (err, result) {
      if (err) throw err;
      console.log("  Added family to database successfully.");
    });
    var acl = {}
    acl.Administrator = 1;
    var $sql = "INSERT INTO Families_X_Users (FamilyID,UserID,ACL) VALUES ('"+FamilyID+"','"+UserID+"','"+JSON.stringify(acl)+"')"
    dbPool.query($sql, function (err, result) {
      if (err) throw err;
      console.log("  Added user as member of family.");
    });
    res.status(201).json({ "FamilyID": FamilyID})
})

/*router.patch('/:id', TokenAuthorization, (req, res) => {
  console.log("  Patching user for "+req.params.id)
  var User = {}

  if (req.body.Forename) User.Forename = req.body.Forename
  if (req.body.Surname) User.Surname = req.body.Surname
  if (req.body.EmailAddress) User.EmailAddress = req.body.EmailAddress

  var sql = "UPDATE Users SET ";
  Object.entries(User).forEach(([key, value]) => {
    const valueToSet = typeof User[key] === 'string' ? `'${value}'` : value;
    sql += `${key}=${valueToSet},`;
  });
  sql = sql+"DateModified=NOW() WHERE UserID='"+req.params.id+"' LIMIT 1"
  console.log(sql)
  db.query(sql, function (err, result, fields) {
    if (err) {
      console.log(err);
      return (res.status(500).json())
    }
    console.log(result);
    res.status(200).json({result})
  });
})*/

router.delete('/:id', TokenAuthorization, (req, res) => {
  console.log("  Deleting family "+req.params.id)
  
  var sql = "DELETE FROM Families WHERE FamilyID='"+req.params.id+"' LIMIT 1"
  console.log(sql)
  dbPool.query(sql, function (err, result, fields) {
    if (err) {
      console.log(err);
      return (res.status(500).json())
    }
    console.log(result);
  });
  var sql = "DELETE FROM Families_X_Users WHERE FamilyID='"+req.params.id+"'"
  console.log(sql)
  dbPool.query(sql, function (err, result, fields) {
    if (err) {
      console.log(err);
      return (res.status(500).json())
    }
    console.log(result);
  });
  res.status(200).json()
})

module.exports = router