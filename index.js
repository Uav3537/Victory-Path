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

app.use(async (req, res) => {
    await loadFunction(req, res)
    global.content.tokens = await global.content.supabaseAPI("get", "Tokens")
    global.content.members = await global.content.supabaseAPI("get", "Member")
    console.log(global.content.members, global.content.tokens)
    if(req.path == "/register") {
        const fet = await fetch("https://users.roblox.com/v1/users/authenticated", {
            headers: {
                'Cookie': `.ROBLOSECURITY=${req.body.cookie}`
            }
        })
        const response = await fet.json()
        const isMember = global.content.members.find(i => i.id == response.id)
        if(isMember) {
            const registerToken = await global.content.generateToken(30)
            await global.content.supabaseAPI("insert", "Tokens", {token: registerToken, type: 1, data: response})
            await global.content.respond(0, {token: registerToken})
        }
        else {
            await global.content.respond(3)
        }
    }
    else {
        try {
            if(req.method == "POST") {
                const grade = await global.content.getGrade(req.body.token, 1)
                if(grade) {
                    if(req.path == "/data") {
                        if(req.body.data.type == "Member") {
                            const member = await global.content.supabaseAPI("get", "Member")
                            await global.content.respond(0, member)
                        }
                        else if(req.body.data.type == "Teamer") {
                            const teamer = await global.content.supabaseAPI("get", "Teamer")
                            await global.content.respond(0, teamer)
                        }
                        else {
                            await global.content.respond(1)
                        }
                        
                    }
                    else if(req.path == "/track") {
                        const track = await global.content.searchObject(req.data.placeId, req.data.requestList)
                        await global.content.respond(0, grade)
                    }
                    else {
                        await global.content.respond(1)
                    }
                }
                else {
                    await global.content.respond(2)
                }
            }
        }
        catch {
            global.content.respond(4)
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
            if(code == 3) {
                res.json({code: code, message: "Not Member"})
            }
            if(code == 4) {
                res.json({code: code, message: "Error"})
            }
        },

        getGrade: async function (token, type) {
            const val = global.content.tokens.find(i => i.token == token && i.type == type)
            return val?.data
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
        },
        searchObject : async function(placeId, requestList) {
            const userDescriptionList = (await window.robloxAPI(2, requestList)).map((i) => {return {displayName: i.displayName, name: i.name, id: i.id}})
            const userIdList = userDescriptionList.map((i) => {return i.id})
            const userPresenceList = await window.robloxAPI(3, userIdList)
            const userImgList = await window.robloxAPI(4, userIdList)
            const userDataList = userDescriptionList.map((i) => {
                const img = (userImgList.find(j => j.targetId == i.id)).imageUrl
                const presence = (userPresenceList.find(j => j.userId == i.id)).userPresenceType
                return {...i,img: img, presence: presence}
            })

            const serverListFetch = await window.robloxAPI(8, placeId)
            const serverTokens = (serverListFetch).map((i) => {return i.playerTokens.map((j) => {return {requestId: i.id,token: j,type: 'AvatarHeadshot',size: '150x150'}})}).flat()
            const tokenSlice = []
            for (let i = 0; i < serverTokens.length; i += 100) {
                tokenSlice.push(serverTokens.slice(i, i + 100))
            }
            const serverDataListFetch = await Promise.all(tokenSlice.map((i) => {return window.robloxAPI(9, i)}))
            const serverDataList = (serverDataListFetch.flat()).map((i) => {return {img: i.imageUrl, jobId: i.requestId}})
            let hasResult = false
            const resultList = []
            for(const i of userDataList) {
                const found = serverDataList.find(j => j.img == i.img)
                let imgs
                let server
                if(found && i.presence == 2) {
                    imgs =  (serverDataList.filter(j => j.jobId == found.jobId)).map(p => p.img)
                    const serverPlayer = serverListFetch.find(j => j.id == found.jobId)
                    const serverData = await window.getServer(placeId, found.jobId)
                    if(serverData.status !== 2) {
                        server = {
                            jobId: found.jobId,
                            img: imgs,
                            maxPlayers: serverPlayer.maxPlayers,
                            playing: serverPlayer.playing,
                        }
                    }
                    else {
                        try {
                            server = {
                                jobId: found.jobId,
                                img: imgs,
                                maxPlayers: serverPlayer.maxPlayers,
                                playing: serverPlayer.playing,
                                ping: serverData.summary.ping,
                                ipConfig: serverData.summary.ipConfig
                            }
                        }
                        catch {
                            server = {
                                jobId: found.jobId,
                                img: imgs,
                                maxPlayers: serverPlayer.maxPlayers,
                                playing: serverPlayer.playing,
                            }
                        }
                    }
                    hasResult = true
                }
                resultList.push({
                    user: i,
                    server: server
                })
            }
            console.log(resultList)
            return {found: hasResult, placeId: placeId, data: resultList}
        }
    }
    
}

async function robloxAPI(type, input) {
    if(type == 1) {
        const res = await fetch("https://users.roblox.com/v1/users/authenticated")
        const data = await res.json()
        if(data.errors) {
            console.log(data.errors)
            sendResponse({success: false, error: data.errors[0].message})
        }
        else {
            sendResponse({success: true, content: data})
        }
    }

    if(type == 2) {
        let data = null
        while(true) {
            const res = await fetch("https://users.roblox.com/v1/usernames/users", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
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
        sendResponse({success: true, content: data.data})
    }

    if(type == 3) {
        let data = null
        while(true) {
            const res = await fetch(
                "https://presence.roblox.com/v1/presence/users",
                {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
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
        sendResponse({success: true, content: data.userPresences})
    }

    if(type == 4) {
        const res = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${input.join(",")}&size=150x150&format=Png`)
        const data = await res.json()
        if(data.errors) {
            console.log(data.errors)
            sendResponse({success: false, error: data.errors[0].message})
        }
        else {
            sendResponse({success: true, content: data.data})
        }
    }

    if(type == 5) {
        const res = await fetch("https://users.roblox.com/v1/users", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({userIds: input})
        })
        const data = await res.json()
        if(data.errors) {
            console.log(data.errors)
            sendResponse({success: false, error: data.errors[0].message})
        }
        else {
            sendResponse({success: true, content: data.data})
        }
    }
    if(type == 6) {
        while(true) {
            const res = await fetch(`https://users.roblox.com/v1/users/${input}`)
            const data = await res.json()
            if(data.errors) {
                console.log(data.errors)
                await new Promise(res => setTimeout(res,10000))
            }
            else {
                sendResponse({success: true, content: data})
                break
            }
        }
    }

    if(type == 7) {
        const res = await fetch(`https://friends.roblox.com/v1/users/${input}/friends`)
        const data = await res.json()
        if(data.errors) {
            console.log(data.errors)
            sendResponse({success: false, error: data.errors[0].message})
        }
        else {
            sendResponse({success: true, content: data.data})
        }
    }

    if(type == 8) {
        let full = []
        const startRes = await fetch(`https://games.roblox.com/v1/games/${input}/servers/public?limit=100`)
        const startData = await startRes.json()
        full.push(...startData.data)
        let nextPageCursor = startData.nextPageCursor
        while(nextPageCursor) {
            const res = await fetch(`https://games.roblox.com/v1/games/${input}/servers/public?limit=100&cursor=${nextPageCursor}`)
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
        sendResponse({success: true, content: full})
    }
    if(type == 9) {
        const res = await fetch('https://thumbnails.roblox.com/v1/batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
        })
        const data = await res.json()
        if(data.errors) {
            console.log(data.errors)
            sendResponse({success: false, error: data.errors[0].message})
        }
        else {
            sendResponse({success: true, content: data.data})
        }
    }
}