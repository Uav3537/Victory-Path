const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

app.listen(PORT, () => {
  console.log(`✅Server running on port ${PORT}`);
})

app.all("/:any(*)", async(req, res) => {
    console.log(req.body)
    if(req.path == "/register") {
        console.log(req.body)
        
    }
    res.json({code: 0})
})