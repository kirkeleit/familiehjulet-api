const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.send('Hello World')
})

router.post('/:id', (req, res) => {
    res.send(req.params.id)
})

module.exports = router