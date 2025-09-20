const { createClient } = require('@supabase/supabase-js');
const config = require('./config.json')
const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceKey
)

console.log(config)
const crypto = require('crypto');

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
    const tokens = await supabaseAPI("get", "Tokens")
    console.log(tokens)
    if(req.method == "GET") {
        
    }
    if(req.method == "POST") {
        if(req.path == "/register") {
            const registerToken = generateToken(30)
            supabaseAPI("insert", "Tokens", {token: registerToken, type: 1})
            respond(0, {token: registerToken})
        }
    }
    console.log(req.body)
})

function generateToken(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}|;:,.<>?"
    let token = ""
    const bytes = crypto.randomBytes(length)
    for (let i = 0; i < length; i++) {
        token += chars[bytes[i] % chars.length]
    }
    return token
}

async function supabaseAPI(type, table, data) {
    if(type == "get") {
        const res = await supabase.from(table).select("*")
        return res
    }

    if(type == "insert") {
        const res = await supabase.from(table).insert(data)
        return res
    }

    if(type == "push") {
        const del = await supabase.from(table).delete()
        const res = await supabase.from(table).insert(data)
        return res
    }
}