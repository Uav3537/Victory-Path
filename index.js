const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

app.listen(PORT, () => {
  console.log(`✅Server running on port ${PORT}`);
})

app.use(async (req, res, next) => {
  console.log(req.body)
  res.json({ code: 0 })
})