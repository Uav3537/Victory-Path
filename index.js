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
    await loadFunction(req,res)
    
    global.content.tokens = await global.content.supabaseAPI("get", "Tokens")
    global.content.members = await global.content.supabaseAPI("get", "Member")
    console.log(global.content.members, global.content.tokens)
    if(req.path == "/register") {
        const registerToken = global.content.generateToken(30)
        await global.content.supabaseAPI("insert", "Tokens", {token: registerToken, type: 1})
        await global.content.respond(0, {token: registerToken})
    }
    else {
        if(req.method == "POST") {
            const grade = await global.content.getGrade(req.body.tokens)
            if(grade) {
                if(req.path == "/find") {
                    await global.content.respond(0, true)
                }
            }
            else {
                await global.content.respond(2)
            }
        }
    }
    console.log(req.body)
})

async function loadFunction(req, res) {
    global.content = {
        respond: async function (code, data) {
            if(code == 0) {
                res.json({code: code, data: data})
            }
            if(code == 1) {
                res.json({code: code, message: "Wrong Request"})
            }
            if(code == 2) {
                res.json({code: code, message: "UnAuthorized"})
            }
        },

        getGrade: async function (token, type) {
            return global.content.tokens.find(i => i.token == token && i.type == type)
        },

        generateToken: async function (length) {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}|;:,.<>?"
            let token = ""
            const bytes = crypto.randomBytes(length)
            for (let i = 0; i < length; i++) {
                token += chars[bytes[i] % chars.length]
            }
            return token
        },

        supabaseAPI: async function (type, table, data) {
            if(type == "get") {
                const res = await supabase.from(table).select("*")
                return res.data
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

            if(type == "delete") {
                const del = await supabase.from(table).delete()
                return del
            }
        }
    }
    
}