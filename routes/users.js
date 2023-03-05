const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const sgMail = require('@sendgrid/mail')
const jwt = require('jsonwebtoken')

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const dbPool = require('../database')
const TokenAuthorization = require("../authorization");

router.get('/user/:id?', TokenAuthorization, (req, res) => {
  let UserIDRequested;
  if (req.params.id != undefined) {
    console.log("params")
    UserIDRequested = req.params.id;
  } else {
    console.log("token")
    UserIDRequested = req.user.UserID;
  }
  console.log("  Userinfo requested for "+UserIDRequested)

  var $sql = "SELECT UserID,Forename,Surname,EmailAddress,DateCreated FROM Users WHERE (UserID='"+UserIDRequested+"') LIMIT 1"
  try {
    dbPool.query($sql, function (err, resUsers, fields) {
      if (err) {
        console.log(err);
        return (res.status(500).json())
      }
      console.log("  Users found with requested ID: "+resUsers.length)
      if (resUsers.length == 0) return res.status(404).json();
      console.log(resUsers);
      res.status(200).json({resUsers})
    });
  }
  catch(err) {
    console.log(err);
    res.status(400).json()
  }
})

router.post('/user/', async (req, res) => {
    console.log ("  New user: "+req.body.Forename+" / "+req.body.EmailAddress)
    var UserID = crypto.randomUUID();
    console.log ("  User ID: "+UserID)
    var $sql = "INSERT INTO Users (UserID,Forename,EmailAddress) VALUES ('"+UserID+"','"+req.body.Forename+"','"+req.body.EmailAddress+"')"
    dbPool.query($sql, function (err, result) {
      if (err) throw err;
      console.log("Added user to database.");
    });
    var AuthenticationToken = crypto.randomUUID();
    console.log ("  Token ID: "+AuthenticationToken)
    var $sql = "INSERT INTO Authentication_Tokens (UserID,AuthenticationToken,DateExpires) VALUES ('"+UserID+"','"+AuthenticationToken+"',date_add(NOW(),interval 30 minute))"
    dbPool.query($sql, function (err, result) {
      if (err) throw err;
      console.log("Created AuhtenticationToken for registration login.");
    });
    const msg = {
      to: req.body.EmailAddress,
      from: 'noreply@familiehjulet.no',
      subject: 'Velkommen til familiehjulet.no!',
      text: 'Hei '+req.body.Forename+'! Trykk på denne linken innen 30 minutt for å fortsette registreringen: '+process.env.BASE_URL+'/users/login/'+AuthenticationToken
    }
    /*sgMail
      .send(msg)
      .then(() => {
        console.log('Email sent to user with authentication link.')
      })
      .catch((error) => {
        console.error(error)
      })*/
    res.status(201).json()
})

router.patch('/user/:id?', TokenAuthorization, (req, res) => {
  let UserID;
  if (req.params.id != undefined) {
    console.log("params")
    UserID = req.params.id;
  } else {
    console.log("token")
    UserID = req.user.UserID;
  }
  console.log("  Patching user for UserID: "+UserID)

  var UserData = {}
  if (req.body.Forename) UserData.Forename = req.body.Forename
  if (req.body.Surname) UserData.Surname = req.body.Surname
  if (req.body.EmailAddress) UserData.EmailAddress = req.body.EmailAddress

  var sql = "UPDATE Users SET ";
  Object.entries(UserData).forEach(([key, value]) => {
    const valueToSet = typeof UserData[key] === 'string' ? `'${value}'` : value;
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

router.delete('/user/:id?', TokenAuthorization, (req, res) => {
  let UserID;
  if (req.params.id != undefined) {
    console.log("params")
    UserID = req.params.id;
  } else {
    console.log("token")
    UserID = req.user.UserID;
  }
  console.log("  Deleting user with UserID: "+UserID)
  
  var sql = "DELETE FROM Users WHERE UserID='"+UserID+"' LIMIT 1"
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

router.post('/login', (req, res) => {
  console.log("  Login requested for "+req.body.EmailAddress)
  var $sql = "SELECT UserID,EmailAddress FROM Users WHERE (EmailAddress='"+req.body.EmailAddress+"') LIMIT 1"
  dbPool.query($sql, function (err, resUsers, fields) {
    if (err) {
      console.log(err);
      return (res.status(500).json())
    }
    console.log("  Users matched for email address: "+resUsers.length)

    // Returns 200 OK even if there is no user matching the requested email address. This is to prevent harvesting known email addresses.
    if (resUsers.length == 0) return (res.status(200).json())

    // Generate unique token for authentication purposes.
    var AuthenticationToken = crypto.randomUUID();
    console.log ("  Generated AuthenticationToken: "+AuthenticationToken)

    // Stores the token i the database.
    var $sql = "INSERT INTO Authentication_Tokens (UserID,AuthenticationToken,DateCreated,DateExpires) VALUES ('"+resUsers[0].UserID+"','"+AuthenticationToken+"',NOW(),date_add(NOW(),interval 30 minute))"
    dbPool.query($sql, function (err, result2) {
      if (err) throw err;
      console.log("  Successfully created and stored AuthenticationToken for future login.");
  
      // Construct email message for login link.
      const msg = {
        to: resUsers[0].EmailAddress,
        from: 'noreply@familiehjulet.no',
        subject: 'Pålogging til familiehjulet.no',
        text: 'Trykk på denne linken innen 30 minutt for å logge inn: https://app.dev.familiehjulet.no/login/token/'+AuthenticationToken
      }
      console.log(msg)
      sgMail
        .send(msg)
        .then(() => {
          console.log('  Email sent to user with authentication link.')
        })
        .catch((error) => {
          console.error(error)
        })
    });
  });
  res.status(200).json()
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

      var $sql = "INSERT INTO Refresh_Tokens (RefreshToken,UserID,UserAgent,RemoteAddr) VALUES ('"+RefreshToken+"','"+user.UserID+"','"+req.headers['user-agent']+"','"+req.ip+"')"
      dbPool.query($sql)

      res.status(200).json({ AccessToken: AccessToken, RefreshToken: RefreshToken })
    }
  })
})

router.post('/token/', (req, res) => {
  const RefreshToken = req.body.token
  if (RefreshToken == null) return res.sendStatus(401)
  console.log("  RefreshToken: "+RefreshToken)

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
      const user2 = { UserID: user.UserID }
      const AccessToken2 = jwt.sign(user2, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10m' })
      res.status(200).json({ AccessToken: AccessToken2 })
    })
  })
})

router.get('/token/', TokenAuthorization, (req, res) => {
  const UserID = req.user.UserID;
  console.log("  Tokens requested for "+UserID)
  var $sql = "SELECT UserID,DateCreated,UserAgent,RemoteAddr FROM Refresh_Tokens WHERE (UserID='"+UserID+"')"
  try {
    dbPool.query($sql, function (err, resTokens, fields) {
      if (err) {
        console.log(err);
        return (res.status(500).json())
      }
      console.log("  RefreshTokens found for UserID: "+resTokens.length)
      if (resTokens.length == 0) return res.status(404).json();
      console.log(resTokens);
      res.status(200).json({resTokens})
    });
  }
  catch(err) {
    console.log(err);
    res.status(400).json()
  }
})

module.exports = router