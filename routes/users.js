const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const sgMail = require('@sendgrid/mail')
const jwt = require('jsonwebtoken')

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const dbPool = require('../database')
const TokenAuthorization = require("../authorization");

router.get('/', TokenAuthorization, (req, res) => {
  console.log("  Userinfo requested for "+req.user.UserID)
  var $sql = "SELECT UserID,Forename,Surname,EmailAddress,DateCreated FROM Users WHERE (UserID='"+req.user.UserID+"') LIMIT 1"
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

router.post('/', async (req, res) => {
    console.log ("  New user: "+req.body.emailaddress)
    var UserID = crypto.randomUUID();
    console.log ("  User ID: "+UserID)
    var $sql = "INSERT INTO Users (UserID,EmailAddress) VALUES ('"+UserID+"','"+req.body.emailaddress+"')"
    dbPool.query($sql, function (err, result) {
      if (err) throw err;
      console.log("Added user to database.");
    });
    var AccessToken = crypto.randomUUID();
    console.log ("  Token ID: "+AccessToken)
    var $sql = "INSERT INTO Access_Tokens (UserID,AccessToken,DateCreated,DateExpiry) VALUES ('"+UserID+"','"+AccessToken+"',NOW(),date_add(NOW(),interval 30 minute))"
    dbPool.query($sql, function (err, result) {
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

router.patch('/:id', TokenAuthorization, (req, res) => {
  const UserID = req.params.id
  console.log("  Patching user for "+UserID)
  var User = {}

  if (req.body.Forename) User.Forename = req.body.Forename
  if (req.body.Surname) User.Surname = req.body.Surname
  if (req.body.EmailAddress) User.EmailAddress = req.body.EmailAddress

  var sql = "UPDATE Users SET ";
  Object.entries(User).forEach(([key, value]) => {
    const valueToSet = typeof User[key] === 'string' ? `'${value}'` : value;
    sql += `${key}=${valueToSet},`;
  });
  sql = sql+"DateModified=NOW() WHERE UserID='"+UserID+"' LIMIT 1"
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

router.delete('/:id', TokenAuthorization, (req, res) => {
  console.log("  Deleting user "+req.params.id)
  
  var sql = "DELETE FROM Users WHERE UserID='"+req.params.id+"' LIMIT 1"
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

router.post('/request_login/', (req, res) => {
  console.log("  Login requested for "+req.body.EmailAddress)
  var $sql = "SELECT UserID,EmailAddress FROM Users WHERE (EmailAddress='"+req.body.EmailAddress+"') LIMIT 1"
  dbPool.query($sql, function (err, result1, fields) {
    if (err) {
      console.log(err);
      return (res.status(500).json())
    }
    var AuthenticationToken = crypto.randomUUID();
    console.log ("  AuthenticationToken: "+AuthenticationToken)
    var $sql = "INSERT INTO Authentication_Tokens (UserID,AuthenticationToken,DateCreated,DateExpires) VALUES ('"+result1[0].UserID+"','"+AuthenticationToken+"',NOW(),date_add(NOW(),interval 30 minute))"
    dbPool.query($sql, function (err, result2) {
      if (err) throw err;
      console.log("  Successfully created AuthenticationToken for login.");
  
      const msg = {
        to: result1[0].EmailAddress,
        from: 'noreply@familiehjulet.no',
        subject: 'Pålogging til familiehjulet.no',
        text: 'Trykk på denne linken for å logge inn: '+process.env.BASE_URL+'users/login/'+AuthenticationToken
        //html: '<strong>and easy to do anywhere, even with Node.js</strong>',
      }
      sgMail
        .send(msg)
        .then(() => {
          console.log('  Email sent to user with authentication link.')
        })
        .catch((error) => {
          console.error(error)
        })
      res.status(200).json()
    });
  });
})

router.get('/login/:id', (req, res) => {
  console.log("  Login request for AuthenticationToken "+req.params.id)
  var $sql = "SELECT UserID FROM Authentication_Tokens WHERE (AuthenticationToken='"+req.params.id+"') AND (DateExpires>NOW())LIMIT 1"
  dbPool.query($sql, function (err, resAuthenticationTokens, fields) {
    if (err) {
      console.log(err);
      return (res.status(500).json())
    }
    console.log (resAuthenticationTokens.length)
    if (resAuthenticationTokens.length == 0) {
      return (res.status(401).json())
    } else {
      var $sql = "UPDATE Authentication_Tokens SET DateExpires=NOW() WHERE AuthenticationToken='"+req.params.id+"' LIMIT 1"
      dbPool.query($sql)
      
      const user = { UserID: resAuthenticationTokens[0].UserID }
      console.log(user)

      const AccessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10m' })
      const RefreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET)

      var $sql = "INSERT INTO Refresh_Tokens (RefreshToken,UserID) VALUES ('"+RefreshToken+"','"+user.UserID+"')"
      dbPool.query($sql)

      res.status(200).json({ AccessToken: AccessToken, RefreshToken: RefreshToken })
    }
  })
})

router.post('/token', (req, res) => {
  const RefreshToken = req.body.token
  if (RefreshToken == null) return res.sendStatus(401)

  var $sql = "SELECT RefreshToken FROM Refresh_Tokens WHERE (RefreshToken='"+RefreshToken+"') LIMIT 1"
  dbPool.query($sql, function (err, resRefreshTokens, fields) {
    if (err) {
      console.log(err);
      return (res.status(500).json())
    }
    console.log (resRefreshTokens.length)
    if (resRefreshTokens.length == 0) return res.sendStatus(403)
    jwt.verify(RefreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
      if (err) return res.sendStatus(403)
      const AccessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10m' })
      res.status(200).json({ AccessToken: AccessToken })
    })
  })
})

module.exports = router