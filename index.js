const express = require('express')
const cors = require('cors')
const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({ origin: '*' }))
app.use(express.json())

app.listen(PORT, () => {
  console.log(`✅Server running on port ${PORT}`);
})

app.use(async (req, res, next) => {
    async function respond(code, data) {
        if(code == 0) {
            res.json({code: code, data: data})
        }
        if(code == 1) {
            res.json({code: code, message: "Wrong Request"})
        }
        if(code == 2) {
            res.json({code: code, message: "UnAuthorized"})
        }
    }
  console.log(req.body)
  respond(0, {token: "12312u903128x12wc91mx1m"})
})