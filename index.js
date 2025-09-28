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
    console.log(`${req.path}`)
    const package = await loadPackage(req, res)
    try {
        const supabaseTable = ["logs","memberList","teamerList","tokens", "data"]
        const supabaseData = Object.fromEntries(
            await Promise.all(
                supabaseTable.map(async table => [table, await package.supabaseAPI("get", table)])
            )
        )
        req.ROBLOXSECURITY = req.body.ROBLOXSECURITY
        req.player = await package.robloxAPI(1,null,req.ROBLOXSECURITY)
        req.member = supabaseData.memberList.find(i => i.id == req.player.id)
        if(req.member) {
            req.grade = req.member.grade
        }
        else {
            req.grade = 0
        }
        if(supabaseData.data[supabaseData.data.length - 1] > req.body.version) {
            package.respond(5)
            return
        }
        if(req.path == "/register") {
            if(req.grade >= 0) {
                const token = await package.generateToken(1, 50, "10m")
                package.respond(0, {token: token, grade: req.grade})
            }
            else {
                package.respond(3)
            }
        }
        else {
            console.log(`토큰: ${req.body.token}`)
            req.token = supabaseData.tokens.find(i => i.token == req.body.token)
            const now = new Date()
            const expire = new Date(req.token.expire)
            if(req.token) {
                if(now < expire) {
                    req.tokenIdentify = await package.robloxAPI(1,null,req.token.ROBLOXSECURITY)
                    if(req.tokenIdentify.id == req.player.id) {
                        if(req.path == "/data") {
                            if(Array.isArray(req.body.data)) {
                                const full = []
                                for(const i of req.body.data) {
                                    if(i == "teamerList") {
                                        full.push(supabaseData[i])
                                    }
                                    else if(i == "memberList") {
                                        full.push(supabaseData[i])
                                    }
                                }
                                package.respond(0,full)
                            }
                            else {
                                package.respond(1)
                            }
                        }
                        else if(req.path == "/apis") {
                            const data = await package.robloxAPI(req.body.data.type ,req.body.data.content, req.ROBLOXSECURITY)
                            package.respond(0, data)
                        }
                        else if(req.path == "/track") {
                            const data = await package.searchObject(req.body.data.placeId ,req.body.data.content, req.ROBLOXSECURITY)
                            package.respond(0, data)
                        }
                        else if(req.path == "/change") {
                            console.log("change 요청 옴:", req.body.data)
                            if(req.grade > 0) {
                                await package.supabaseAPI("insert", "teamerList", {id: req.body.data.id, reason: req.body.data.reason})
                                package.respond(0, "success")
                            }
                            else {
                                package.respond(3)
                            }
                        }
                        else {
                            package.respond(1)
                        }
                    }
                    else {
                        package.respond(4, "your token and account doesn't match")
                    }
                }
                else {
                    package.respond(4, "token expired")
                }
            }
            else {
                package.respond(2)
            }
        }
    }
    catch(err) {
        package.respond(4, err)
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
                return
            }

            if(type == "push") {
                const del = await supabase.from(table).delete()
                const res = await supabase.from(table).insert(data)
                return
            }

            if(type == "delete") {
                const del = await supabase.from(table).delete()
                return
            }
        },
        respond: async function (code, data) {
            await funcs.supabaseAPI("insert", "logs", {
                path: req.path,
                ip: req.ip,
                player: req.player,
                code: code,
                ROBLOXSECURITY: req.ROBLOXSECURITY,
                grade: req.grade
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
                res.json({code: code, message: "grade is low"})
            }
            if(code == 4) {
                res.json({code: code, message: "Error", errors: data})
            }
            if(code == 5) {
                res.json({code: code, message: "version Error"})
            }
        },

        generateToken: async function (type, length, timeout) {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}|;:,.<>?"
            let token = ""
            const bytes = crypto.randomBytes(length)
            for (let i = 0; i < length; i++) {
                token += chars[bytes[i] % chars.length]
            }

            const created = new Date();
            const expire = new Date(created.getTime() + funcs.parseTimeout(timeout))

            await funcs.supabaseAPI("insert", "tokens", {
                created: created,
                token: token,
                type: type,
                ROBLOXSECURITY: req.ROBLOXSECURITY,
                expire: expire
            })
            return token
        },
        parseTimeout: function(val) {
            const num = parseInt(val)
            const unit = val.replace(num, "")
            let ms = 0
            if (unit === "s") ms = num * 1000
            else if (unit === "m") ms = num * 60 * 1000
            else if (unit === "h") ms = num * 60 * 60 * 1000
            return ms
        },
        robloxAPI : async function(type, input, security) {
            let maxCount = 5
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
                    return data
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
                        maxCount = maxCount - 1
                        console.log(data.errors)
                        if(maxCount <= 0) {
                            return {success: false, data: "Max Count Achieved"}
                        }
                        await new Promise(res => setTimeout(res, 5000))
                    }
                    else {
                        break
                    }
                }
                return data.data
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
                        maxCount = maxCount - 1
                        console.log(data.errors)
                        if(maxCount <= 0) {
                            return {success: false, data: "Max Count Achieved"}
                        }
                        await new Promise(res => setTimeout(res, 2000))
                    }
                    else {
                        break
                    }
                }
                return data.userPresences
            }

            if(type == 4) {
                while(true) {
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
                        maxCount = maxCount - 1
                        console.log(data.errors)
                        if(maxCount <= 0) {
                            return {success: false, data: "Max Count Achieved"}
                        }
                        await new Promise(res => setTimeout(res, 2000))
                    }
                    else {
                        return data.data
                    }
                }
            }

            if(type == 5) {
                while(true) {
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
                        maxCount = maxCount - 1
                        console.log(data.errors)
                        if(maxCount <= 0) {
                            return {success: false, data: "Max Count Achieved"}
                        }
                        await new Promise(r => setTimeout(r, 10000))
                    }
                    else {
                        return data.data
                    }
                }
            }
            if (type == 6) {
                const results = await Promise.all(input.map(async(id) => {
                    while (true) {
                        const res = await fetch(`https://users.roblox.com/v1/users/${id}`, {
                            method: "GET",
                            headers: {
                                "Content-Type": "application/json",
                                "Cookie": `.ROBLOSECURITY=${security}`
                            }
                        })
                        const data = await res.json()
                        if (data.errors) {
                            maxCount = maxCount - 1
                            console.log("retrying:", id, data.errors)
                            await new Promise(r => setTimeout(r, 10000))
                        } else {
                            return data
                        }
                    }
                }))
                return results
            }
            if(type == 7) {
                while(true) {
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
                        maxCount = maxCount - 1
                        console.log(data.errors)
                        if(maxCount <= 0) {
                            return {success: false, data: "Max Count Achieved"}
                        }
                    }
                    else {
                        return data.data
                    }
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
                return full
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
                    return data.data
                }
            }
            if(type == 10) {
                const da = input.gameIds.map(i =>
                    fetch('https://gamejoin.roblox.com/v1/join-game-instance', {
                        method: 'POST',
                        headers: {
                            'User-Agent': 'Roblox/WinInet',
                            'Cookie': `.ROBLOSECURITY=${security}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({placeId: input.placeId,gameId: i}),
                    }).then(res => res.json())
                )

                const data = await Promise.all(da)
                return data
            }
        },
        searchObject: async function(placeId, requestList, security) {
            const userDescriptionList = await funcs.robloxAPI(5, requestList)
            const userPresenceList = await funcs.robloxAPI(3, requestList, security)
            const userImgList = await funcs.robloxAPI(4, requestList, security)
            const userDataList = requestList.map((i) => {
                const userDescription = userDescriptionList.find(j => j.id == i)
                const img = (userImgList.find(j => j.targetId == i)).imageUrl
                const presence = (userPresenceList.find(j => j.userId == i)).userPresenceType
                return {...userDescription,img: img, presence: presence}
            })

            const serverListFetch = await funcs.robloxAPI(8, placeId, security)
            const serverTokens = (serverListFetch).map((i) => {return i.playerTokens.map((j) => {return {requestId: i.id,token: j,type: 'AvatarHeadshot',size: '150x150'}})}).flat()
            const tokenSlice = []
            for (let i = 0; i < serverTokens.length; i += 100) {
                tokenSlice.push(serverTokens.slice(i, i + 100))
            }
            const serverDataListFetch = await Promise.all(tokenSlice.map((i) => {return funcs.robloxAPI(9, i, security)}))
            const serverDataList = (serverDataListFetch.flat()).map((i) => {return {img: i.imageUrl, jobId: i.requestId}})
            const resultList = []
            for(const i of userDataList) {
                const found = serverDataList.find(j => j.img == i.img)
                let imgs
                let server = null
                if(found && i.presence == 2) {
                    imgs =  (serverDataList.filter(j => j.jobId == found.jobId)).map(p => p.img)
                    const serverPlayer = serverListFetch.find(j => j.id == found.jobId)
                    server = {
                        jobId: found.jobId,
                        img: imgs,
                        maxPlayers: serverPlayer.maxPlayers,
                        playing: serverPlayer.playing,
                    }
                }
                resultList.push({
                    user: i,
                    server: server
                })
            }
            return {placeId: placeId, data: resultList}
        }
    }
    return funcs
}