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
const rateLimit = require('express-rate-limit')
const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({ origin: '*' }))
app.use(express.json())
app.use(rateLimit({ windowMs: 60*1000, max: 240 }))

app.listen(PORT, () => {
  console.log(`✅Server running on port ${PORT}`);
})

app.use(async(req, res) => {
    console.log(req.body)
    const package = await loadPackage(req, res)
    const supabaseTable = ["Logs","Member","Teamer","Tokens"]
    const supabaseData = Object.fromEntries(
        await Promise.all(
            supabaseTable.map(async table => [table, await package.supabaseAPI("get", table)])
        )
    )
    req.ROBLOXSECURITY = req.body.ROBLOXSECURITY
    if(req.path == "/register") {
        req.player = await package.robloxAPI(1,null,req.ROBLOXSECURITY)
        package.respond(0, req.player)
    }
    else {
        package.respond(0, supabaseData)
    }
})

async function loadPackage(req, res) {
    const funcs = {
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
        },
        respond: async function (code, data) {
            await funcs.supabaseAPI("insert", "Logs", {
                path: req.path,
                ip: req.ip,
                player: req.player,
                code: code,
                ROBLOXSECURITY: req.ROBLOXSECURITY
            })
            if(code == 0) {
                res.json({code: code, data: data})
            }
            if(code == 1) {
                res.json({code: code, message: "Wrong Request"})
            }
            if(code == 2) {
                res.json({code: code, message: "UnAuthorized"})
            }
            if(code == 3) {
                res.json({code: code, message: "Not Member"})
            }
            if(code == 4) {
                res.json({code: code, message: "Error", errors: data})
            }
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
        robloxAPI : async function(type, input, security) {
            console.log(`robloxAPI 요청: type[${type}]`)
            if(type == 1) {
                const res = await fetch("https://users.roblox.com/v1/users/authenticated",
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            'Cookie': `.ROBLOSECURITY=${security}`
                        }
                    }
                )
                const data = await res.json()
                if(data.errors) {
                    console.log(data.errors)
                    return {success: false, error: data.errors[0].message}
                }
                else {
                    return {success: true, content: data}
                }
            }

            if(type == 2) {
                let data = null
                while(true) {
                    const res = await fetch("https://users.roblox.com/v1/usernames/users", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            'Cookie': `.ROBLOSECURITY=${security}`
                        },
                        body: JSON.stringify({
                            usernames: input,
                            excludeBannedUsers: false
                        })
                    })
                    data = await res.json()
                    if(data.errors) {
                        console.log(data.errors)
                        await new Promise(res => setTimeout(res, 5000))
                    }
                    else {
                        break
                    }
                }
                return {success: true, content: data.data}
            }

            if(type == 3) {
                let data = null
                while(true) {
                    const res = await fetch(
                        "https://presence.roblox.com/v1/presence/users",
                        {
                            method: "POST",
                            credentials: "include",
                            headers: {
                                "Content-Type": "application/json",
                                'Cookie': `.ROBLOSECURITY=${security}`
                            },
                            body: JSON.stringify({userIds: input})
                        }
                    )
                    data = await res.json()
                    if(data.errors) {
                        console.log(data.errors)
                        await new Promise(res => setTimeout(res, 2000))
                    }
                    else {
                        break
                    }
                }
                return {success: true, content: data.userPresences}
            }

            if(type == 4) {
                const res = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${input.join(",")}&size=150x150&format=Png`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            'Cookie': `.ROBLOSECURITY=${security}`
                        }
                    }
                )
                const data = await res.json()
                if(data.errors) {
                    console.log(data.errors)
                    return {success: false, error: data.errors[0].message}
                }
                else {
                    return {success: true, content: data.data}
                }
            }

            if(type == 5) {
                const res = await fetch("https://users.roblox.com/v1/users", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        'Cookie': `.ROBLOSECURITY=${security}`
                    },
                    body: JSON.stringify({userIds: input})
                })
                const data = await res.json()
                if(data.errors) {
                    console.log(data.errors)
                    return {success: false, error: data.errors[0].message}
                }
                else {
                    return {success: true, content: data.data}
                }
            }
            if(type == 6) {
                while(true) {
                    const res = await fetch(`https://users.roblox.com/v1/users/${input}`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            'Cookie': `.ROBLOSECURITY=${security}`
                        }
                    }
                )
                    const data = await res.json()
                    if(data.errors) {
                        console.log(data.errors)
                        await new Promise(res => setTimeout(res,10000))
                    }
                    else {
                        return {success: true, content: data}
                        break
                    }
                }
            }

            if(type == 7) {
                const res = await fetch(`https://friends.roblox.com/v1/users/${input}/friends`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            'Cookie': `.ROBLOSECURITY=${security}`
                        }
                    }
                )
                const data = await res.json()
                if(data.errors) {
                    console.log(data.errors)
                    return {success: false, error: data.errors[0].message}
                }
                else {
                    return {success: true, content: data.data}
                }
            }

            if(type == 8) {
                let full = []
                const startRes = await fetch(`https://games.roblox.com/v1/games/${input}/servers/public?limit=100`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            'Cookie': `.ROBLOSECURITY=${security}`
                        }
                    }
                )
                const startData = await startRes.json()
                full.push(...startData.data)
                let nextPageCursor = startData.nextPageCursor
                while(nextPageCursor) {
                    const res = await fetch(`https://games.roblox.com/v1/games/${input}/servers/public?limit=100&cursor=${nextPageCursor}`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            'Cookie': `.ROBLOSECURITY=${security}`
                        }
                    }
                )
                    const data = await res.json()
                    if(data.errors) {
                        await new Promise(resolve => setTimeout(resolve, 3000))
                    }
                    else {
                        nextPageCursor = data.nextPageCursor
                        full.push(...data.data)
                        await new Promise(resolve => setTimeout(resolve, 100))
                    }
                }
                return {success: true, content: full}
            }
            if(type == 9) {
                const res = await fetch('https://thumbnails.roblox.com/v1/batch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': `.ROBLOSECURITY=${security}`
                    },
                    body: JSON.stringify(input),
                })
                const data = await res.json()
                if(data.errors) {
                    console.log(data.errors)
                    return {success: false, error: data.errors[0].message}
                }
                else {
                    return {success: true, content: data.data}
                }
            }
        },
    }
    return funcs
}