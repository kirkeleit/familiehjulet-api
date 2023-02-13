const express = require('express')
const router = express.Router()
const mysql = require('mysql2')
const crypto = require('crypto')
const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: "familiehjulet"})

db.connect(function (err) {
  if (err) console.error(err)
  console.log("Connected to Database in router users.js")
})

router.get('/:id', (req, res) => {
  console.log("  Userinfo requested for "+req.params.id)
  var $sql = "SELECT UserID,Forename,Surname,EmailAddress,DateCreated FROM Users WHERE (UserID='"+req.params.id+"') LIMIT 1"
  try {
    db.query($sql, function (err, result, fields) {
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

router.post('/', async (req, res) => {
    console.log ("  New user: "+req.body.emailaddress)
    var UserID = crypto.randomUUID();
    console.log ("  User ID: "+UserID)
    var $sql = "INSERT INTO Users (UserID,EmailAddress) VALUES ('"+UserID+"','"+req.body.emailaddress+"')"
    db.query($sql, function (err, result) {
      if (err) throw err;
      console.log("Added user to database.");
    });
    var AccessToken = crypto.randomUUID();
    console.log ("  Token ID: "+AccessToken)
    var $sql = "INSERT INTO Access_Tokens (UserID,AccessToken,DateCreated,DateExpiry) VALUES ('"+UserID+"','"+AccessToken+"',NOW(),date_add(NOW(),interval 30 minute))"
    db.query($sql, function (err, result) {
      if (err) throw err;
      console.log("Created Access Token for registration login.");
    });
    const msg = {
      to: req.body.emailaddress,
      from: 'noreply@familiehjulet.no',
      subject: 'Velkommen til familiehjulet.no!',
      text: 'Trykk på denne linken for å fortsette registreringen: '+process.env.BASE_URL+'auth/'+AccessToken
      //html: '<strong>and easy to do anywhere, even with Node.js</strong>',
    }
    sgMail
      .send(msg)
      .then(() => {
        console.log('Email sent to user with authentication link.')
      })
      .catch((error) => {
        console.error(error)
      })
    res.status(201).json({ "userid": UserID})
})

router.patch('/:id', (req, res) => {
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
})

router.delete('/:id', (req, res) => {
  console.log("  Patching user for "+req.params.id)
  
  var sql = "DELETE FROM Users WHERE UserID='"+req.params.id+"' LIMIT 1"
  console.log(sql)
  db.query(sql, function (err, result, fields) {
    if (err) {
      console.log(err);
      return (res.status(500).json())
    }
    console.log(result);
    res.status(200).json({result})
  });
})

router.get('/requestlogin/:id', (req, res) => {
  console.log("  Login requested for "+req.params.id)
  var $sql = "SELECT EmailAddress FROM Users WHERE (UserID='"+req.params.id+"') LIMIT 1"
  var EmailAddress = ""
  db.query($sql, function (err, result1, fields) {
    if (err) {
      console.log(err);
      return (res.status(500).json())
    }
    console.log(result1);
    console.log(result1[0].EmailAddress)
    var AccessToken = crypto.randomUUID();
    console.log ("  Token ID: "+AccessToken)
    var $sql = "INSERT INTO Access_Tokens (UserID,AccessToken,DateCreated,DateExpiry) VALUES ('"+req.params.id+"','"+AccessToken+"',NOW(),date_add(NOW(),interval 30 minute))"
    db.query($sql, function (err, result2) {
      if (err) throw err;
      console.log("Created Access Token for registration login.");
  
      const msg = {
        to: result1[0].EmailAddress,
        from: 'noreply@familiehjulet.no',
        subject: 'Pålogging til familiehjulet.no',
        text: 'Trykk på denne linken for å logge inn: '+process.env.BASE_URL+'auth/'+AccessToken
        //html: '<strong>and easy to do anywhere, even with Node.js</strong>',
      }
      sgMail
        .send(msg)
        .then(() => {
          console.log('Email sent to user with authentication link.')
        })
        .catch((error) => {
          console.error(error)
        })
      res.status(200).json()
    });
  });
})

module.exports = router