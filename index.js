const { createClient } = require('@supabase/supabase-js');
const config = require('./config.json')
const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceKey
)
const crypto = require('crypto');

const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit');
const { register } = require('module');
const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({ origin: '*' }))
app.use(express.json())
app.use(rateLimit({ windowMs: 60*1000, max: 240 }))

app.set('trust proxy', true);

app.listen(PORT, () => {
    console.log(`✅Server running on port ${PORT}`)
})

app.use(express.static('resources'))
const path = require("path");

app.get("/mobile", (req, res) => {
    res.sendFile(path.join(__dirname, "resources/mobile.html"));
});

app.all(/^\/mobile\/(.*)/, async(req, res, next) => {
    const package = setup(req, res)
    const sub = req.path.replace("/mobile", "")
    if(sub == "/register") {
        const token = await package.generateToken(1, 50, {minute: 5})
        await package.supabaseAPI("insert", "tokens", {
            ...token,
            rosecurity: config.rosecurity,
            grade: 1,
            ip: req.ip,
            position: req.body.data
        })
        return package.respond(0, token)
    }
    else {
        req.grade = 1
        const table = await package.supabaseAPI("get", "memberList")
        req.rosecurity = table.find(i => i.id == req.user.id)?.rosecurity
        next()
    }
})

app.use(async(req, res) => {
    const package = setup(req, res)
    req.localVersion = req.body?.version
    if(!req.rosecurity) {
        req.rosecurity = req.body?.rosecurity
    }
    req.data = req.body?.data
    try {
        if(req.path == "/register") {
            const data = await package.supabaseAPI("get", "data")
            const version = data?.[data.length - 1]?.version
            if(version > req.localVersion) {
                return package.respond(8)
            }
            req.user = await package.robloxAPI("authorization", req.rosecurity)
            const token = await package.generateToken(1, 50, {minute: 5})
            const table = await package.supabaseAPI("get", "memberList")
            req.grade = table.find(i => i.id == req.user.id)?.grade
            const content = {
                ...token,
                rosecurity: req.rosecurity,
                grade: req.grade,
                ip: req.ip,
                position: {}
            }
            if(req.grade >= 4) {
                content.rosecurity = "manager"
                req.ip = "manager"
                req.position = {}
            }
            await package.supabaseAPI("insert", "tokens", content)
            return package.respond(0, content)
        }
        req.token = req.body?.token
        req.found = (await package.findToken(req.token))
        if(!req.found?.token) {
            return package.respond(3)
        }
        if(req.found?.expired) {
            return package.respond(4)
        }
        req.grade = req.found.grade
        req.user = await package.robloxAPI("authorization", req.rosecurity)
        console.log(`${req.user?.name} [등급: ${req.grade}]의 요청: ${req.path}`)
        if(req.path == "/data") {
            if(!Array.isArray(req.data)) {
                package.respond(5)
                return
            } 
            const result = []
            for(const i of req.data) {
                if(i == "teamerList" && req.grade >= 1) {
                    const table = await package.supabaseAPI("get", i)
                    result.push(table)
                }
                else if(i == "memberList" && req.grade >= 1) {
                    const table = await package.supabaseAPI("get", i)
                    result.push(table)
                }
                else if(i == "reasons" && req.grade >= 1) {
                    const table = await package.supabaseAPI("get", i)
                    result.push(table)
                }
                else if(i == "country" && req.grade >= 1) {
                    const table = await package.supabaseAPI("get", i)
                    result.push(table)
                }
                else {
                    result.push([])
                }
            }
            package.respond(0, result)
        }
        else if(req.path == "/apis") {
            if(typeof req.data !== "object" || typeof req.data?.type !== "string") {
                package.respond(5)
                return
            }
            if(req.grade >= 1) {
                try {
                    const fet = await package.robloxAPI(req.data.type, req.data.content);
                    package.respond(0, fet);
                } catch(err) {
                    console.error("robloxAPI 오류:", err);
                    package.respond(1, err.message || err);
                }
            }
            else {
                package.respond(7)
            }
        }
        else if(req.path == "/track") {
            if(typeof req.data !== "object" || !Array.isArray(req.data?.content)) {
                package.respond(5)
                return
            }
            const fet = await package.searchObject(req.data.placeId, req.data.content)
            package.respond(0, fet)
        }
        else if(req.path == "/change") {
            if(typeof req.data !== "object" || !Array.isArray(req.data.reason)) {
                package.respond(5)
                return
            }
            if(!(req.grade >= 1)) {
                package.respond(7)
                return
            }
            package.supabaseAPI("insert", "teamerList", {
                id: req.data.id,
                reason: req.data.reason.map(i => i.name)
            })
            package.respond(0)
        }
        else {
            package.respond(6)
        }
    }
    catch(error) {
        console.log(`전체 에러: ${error.message}`)
        return package.respond(1, error.message)
    }
});

function setup(req, res) {
    return {
        rosecurity: req.rosecurity,
        supabaseTable: ["logs","memberList","teamerList","tokens", "data", "reasons", "country"],
        respond: function(code, message) {
            if(code == 0) {
                res.json({success: true, errors: null, data: message})
            }
            if(code == 1) {
                res.json({success: false, errors: message, data: null})
            }
            if(code == 2) {
                res.json({success: false, errors: "not authorized", data: null})
            }
            if(code == 3) {
                res.json({success: false, errors: "no token found", data: null})
            }
            if(code == 4) {
                res.json({success: false, errors: "token expired", data: null})
            }
            if(code == 5) {
                res.json({success: false, errors: "wrong request", data: null})
            }
            if(code == 6) {
                res.json({success: false, errors: "path error", data: null})
            }
            if(code == 7) {
                res.json({success: false, errors: "no authority", data: null})
            }
            if(code == 8) {
                res.json({success: false, errors: "version error", data: null})
            }
        },
        supabaseAPI: async function (type, table, data) {
            if(type == "get") {
                const res = await supabase.from(table).select("*")
                return res.data
            }

            if(type == "insert") {
                const res = await supabase.from(table).insert(data).select()
                return res
            }
        },
        generateToken: async function (type, length, timeout) {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}|;:,.<>?"
            let token = ""
            const bytes = crypto.randomBytes(length)
            for (let i = 0; i < length; i++) {
                token += chars[bytes[i] % chars.length]
            }

            const timeoutMs =
            ((timeout.day || 0) * 24 * 60 * 60 * 1000) +
            ((timeout.hour || 0) * 60 * 60 * 1000) +
            ((timeout.minute || 0) * 60 * 1000) +
            ((timeout.second || 0) * 1000);

            const expire = new Date(Date.now() + timeoutMs).toISOString();
            return {
                token: token,
                type: type,
                expire: expire
            }
        },
        findToken: async function(token) {
            const table = await this.supabaseAPI("get", "tokens")

            const now = Date.now();
            const data = table.find(i => i.token == token)
            if(!data) {
                return null
            }
            const isExpired =  (new Date(data.expire) > now)
            return {...data, expired: isExpired}
        },
        sliceArray: function(array, chunkSize) {
            const result = []
            for (let i = 0; i < array.length; i += chunkSize) {
                result.push(array.slice(i, i + chunkSize))
            }
            return result
        },
        robloxAPI: async function(type, input) {
            const headers = {
                "Content-Type": "application/json",
                'Cookie': `.ROBLOSECURITY=${this.rosecurity}`
            }
            let data = null
            if(type == "authorization") {
                try {
                    if(typeof input !== "string") {
                        throw new Error("Type Error: request is not a string")
                    }
                    for(let i=5;i>0;i=i-1) {
                        const fet = await fetch(`https://users.roblox.com/v1/users/authenticated`, {
                            method: "GET",
                            headers: {
                                "Content-Type": "application/json",
                                'Cookie': `.ROBLOSECURITY=${input}`
                            }
                        })
                        const res = await fet.json()
                        if(res.errors) {
                            throw new Error(res.errors?.[0]?.message)
                        }
                        data = res
                    }
                }
                catch(error) {
                    console.log(`robloxAPI(type: ${type}, input:`, input,`)\n에러발생: ${error.message}`)
                    data = error.message
                }
            }
            else if(type == "usernames") {
                try {
                    if(!Array.isArray(input)) {
                        throw new Error("Type Error: request is not an array")
                    }
                    const arr = this.sliceArray(input, 100)
                    data = (await Promise.all(arr.map(async(i) => {
                        let errors = null
                        for(let j=5;j>0;j=j-1) {
                            try {
                                const fet = await fetch(`https://users.roblox.com/v1/usernames/users`, {
                                    method: "POST",
                                    headers: headers,
                                    body: JSON.stringify({
                                        usernames: i,
                                        excludeBannedUsers: false
                                    })
                                })
                                const res = await fet.json()
                                if(res.errors || !res.data) {
                                    throw new Error(res.errors?.[0]?.message)
                                }
                                return res.data
                            }
                            catch(error) {
                                console.log(`robloxAPI(type: ${type}, input:`, i,`)\n에러발생: ${error.message}`)
                                errors = error.message
                                await new Promise(resolve => setTimeout(resolve, 2000))
                            }
                        }
                        return errors
                    }))).flat()
                }
                catch(error) {
                    console.log(`robloxAPI(type: ${type}, input:`, input,`)\n에러발생:`, error.message)
                    data = error.message
                }
            }
            else if(type == "presence") {
                try {
                    if(!Array.isArray(input)) {
                        throw new Error("Type Error: request is not an array")
                    }
                    const arr = this.sliceArray(input, 50)
                    data = (await Promise.all(arr.map(async(i) => {
                        let errors = null
                        for(let j=5;j>0;j=j-1) {
                            try {
                                const fet = await fetch(`https://presence.roblox.com/v1/presence/users`, {
                                    method: "POST",
                                    headers: headers,
                                    body: JSON.stringify({
                                        userIds: i
                                    })
                                })
                                const res = await fet.json()
                                if(res.errors || !res.data) {
                                    throw new Error(res.errors?.[0]?.message)
                                }
                                return res.userPresences
                            }
                            catch(error) {
                                console.log(`robloxAPI(type: ${type}, input:`, i,`)\n에러발생: ${error.message}`)
                                errors = error.message
                                await new Promise(resolve => setTimeout(resolve, 2000))
                            }
                        }
                        return errors
                    }))).flat()
                }
                catch(error) {
                    console.log(`robloxAPI(type: ${type}, input:`, input,`)\n에러발생:`, error.message)
                    data = error.message
                }
            }
            else if(type == "thumbnails") {
                try {
                    if(!Array.isArray(input)) {
                        throw new Error("Type Error: request is not an array")
                    }
                    const arr = this.sliceArray(input, 100)
                    data = (await Promise.all(arr.map(async(i) => {
                        let errors = null
                        for(let j=5;j>0;j=j-1) {
                            try {
                                const fet = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${i.join(",")}&size=150x150&format=Png`, {
                                    method: "GET",
                                    headers: headers,
                                })
                                const res = await fet.json()
                                if(res.errors || !res.data) {
                                    throw new Error(res.errors?.[0]?.message)
                                }
                                return res.data
                            }
                            catch(error) {
                                console.log(`robloxAPI(type: ${type}, input:`, i,`)\n에러발생: ${error.message}`)
                                errors = error.message
                                await new Promise(resolve => setTimeout(resolve, 2000))
                            }
                        }
                        return errors
                    }))).flat()
                }
                catch(error) {
                    console.log(`robloxAPI(type: ${type}, input:`, input,`)\n에러발생:`, error.message)
                    data = error.message
                }
            }
            else if(type == "thumbnailsBatch") {
                try {
                    if(!Array.isArray(input)) {
                        throw new Error("Type Error: request is not an array")
                    }
                    const arr = this.sliceArray(input, 100)
                    data = (await Promise.all(arr.map(async(i) => {
                        let errors = null
                        for(let j=5;j>0;j=j-1) {
                            try {
                                const fet = await fetch(`https://thumbnails.roblox.com/v1/batch`, {
                                    method: "POST",
                                    headers: headers,
                                    body: JSON.stringify(i)
                                })
                                const res = await fet.json()
                                if(res.errors || !res.data) {
                                    throw new Error(res.errors?.[0]?.message)
                                }
                                return res.data
                            }
                            catch(error) {
                                console.log(`robloxAPI(type: ${type}, input:`, i,`)\n에러발생: ${error.message}`)
                                errors = error.message
                                await new Promise(resolve => setTimeout(resolve, 2000))
                            }
                        }
                        return errors
                    }))).flat()
                }
                catch(error) {
                    console.log(`robloxAPI(type: ${type}, input:`, input,`)\n에러발생:`, error.message)
                    data = error.message
                }
            }
            else if(type == "users") {
                try {
                    if(!Array.isArray(input)) {
                        throw new Error("Type Error: request is not an array")
                    }
                    data = await Promise.all(input.map(async(i) => {
                        let errors = null
                        for(let j=5;j>0;j=j-1) {
                            try {
                                const fet = await fetch(`https://users.roblox.com/v1/users/${i}`, {
                                    method: "GET",
                                    headers: headers
                                })
                                const res = await fet.json()
                                if(res.errors) {
                                    throw new Error(res.errors?.[0]?.message)
                                }
                                return res
                            }
                            catch(error) {
                                console.log(`robloxAPI(type: ${type}, input:`, i,`)\n에러발생: ${error.message}`)
                                errors = error.message
                                await new Promise(resolve => setTimeout(resolve, 2000))
                            }
                        }
                        return errors
                    }))
                }
                catch(error) {
                    console.log(`robloxAPI(type: ${type}, input:`, input,`)\n에러발생:`, error.message)
                    data = error.message
                }
            }
            else if(type == "friends") {
                try {
                    if(typeof input !== "string") {
                        throw new Error("Type Error: request is not an string")
                    }
                    for(let i=5;i>0;i=i-1) {
                        const fet = await fetch(`https://friends.roblox.com/v1/users/${input}/friends`, {
                            method: "GET",
                            headers: headers
                        })
                        const res = await fet.json()
                        if(res.errors) {
                            throw new Error(data.errors?.[0])
                        }
                        data = res
                    }
                }
                catch(error) {
                    console.log(`robloxAPI(type: ${type}, input:`, input,`)\n에러발생: ${error.message}`)
                    data = error.message
                }
            }
            else if(type == "servers") {
                try {
                    if(typeof input !== "object") {
                        throw new Error("Type Error: request is not an object - request should be {placeId: (number or string), count: (number)}")
                    }
                    if(typeof input.placeId !== "string" && typeof input.placeId !== "number") {
                        throw new Error("Type Error: request.placeId is not a number or string")
                    }
                    if(typeof input.count !== "number") {
                        throw new Error("Type Error: request.count is not a number")
                    }
                    let cursor = null
                    const arr = []
                    while(true) {
                        try {
                            const link = (cursor)
                                ? `https://games.roblox.com/v1/games/${input.placeId}/servers/public?limit=100&cursor=${cursor}`
                                : `https://games.roblox.com/v1/games/${input.placeId}/servers/public?limit=100`
                            const fet = await fetch(link, {
                                method: "GET",
                                headers: headers
                            })
                            const res = await fet.json()
                            if(res.errors) {
                                throw new Error(data.errors?.[0])
                            }
                            arr.push(...res.data)
                            cursor = res.nextPageCursor
                            if(!cursor || input.count <= arr.length) {
                                break
                            }
                        }
                        catch(error) {
                            console.log(`robloxAPI(type: ${type}, input:`, input,`)\n에러발생: ${error.message}`)
                            await new Promise(resolve => setTimeout(resolve, 4000))
                        }
                    }
                    data = arr.slice(0, input.count)
                }
                catch(error) {
                    console.log(`robloxAPI(type: ${type}, input:`, input,`)\n에러발생: ${error.message}`)
                    data = error.message
                }
            }
            else if(type == "serverDetail") {
                try {
                    if(!Array.isArray(input)) {
                        throw new Error("Type Error: request is not an array")
                    }
                    data = await Promise.all(input.map(async(i) => {
                        let errors = null
                        for(let j=5;j>0;j=j-1) {
                            try {
                                const fet = await fetch(`https://gamejoin.roblox.com/v1/join-game-instance`, {
                                    method: "POST",
                                    headers: {
                                        'User-Agent': 'Roblox/WinInet',
                                        ...headers
                                    },
                                    body: JSON.stringify({
                                        placeId: i.placeId,
                                        gameId: i.jobId
                                    })
                                })
                                const res = await fet.json()
                                return res
                            }
                            catch(error) {
                                console.log(`robloxAPI(type: ${type}, input:`, i,`)\n에러발생: ${error.message}`)
                                errors = error.message
                                await new Promise(resolve => setTimeout(resolve, 2000))
                            }
                        }
                        return errors
                    }))
                }
                catch(error) {
                    console.log(`robloxAPI(type: ${type}, input:`, input,`)\n에러발생:`, error.message)
                    data = error.message
                }
            }
            else {
                const error = "Request Error: no type has been found"
                console.log(`robloxAPI(type: ${type}, input:`, input,`)\n에러발생:`, error)
                data = error
            }
            return data
        },
        searchObject: async function(placeId, idList) {
            const playerFetchList = await this.robloxAPI("users", idList)
            const playerImgList = await this.robloxAPI("thumbnails", idList)
            const playerFullList = playerFetchList.map(i => {
                const img = playerImgList.find(j => j.targetId == i.id)
                return {
                    ...i,
                    img: img?.imageUrl
                }
            })

            const serverFetchList = await this.robloxAPI("servers", {placeId: placeId, count: 200})
            const serverBatchList = await this.robloxAPI("thumbnailsBatch", serverFetchList.map(i => ({jobId: i.id, token: i.playerTokens})).flat().flatMap(i => i.token.map(j => ({requestId: i.jobId, token: j, type: 'AvatarHeadshot', size: '150x150'}))))
            const serverFullList = serverFetchList.map(i => {
                const img = serverBatchList.filter(j => j.requestId == i.id).map(j => j.imageUrl)
                return {
                    jobId: i.id,
                    maxPlayers: i.maxPlayers,
                    playing: i.playing,
                    img: img
                }
            })

            const result = playerFullList.map(i => {
                let server = null
                for(const j of serverFullList) {
                    for(const t of j.img) {
                        if(t == i.img) {
                            server = {
                                jobId: j.jobId,
                                img: j.img,
                                maxPlayers: j.maxPlayers,
                                playing: j.playing,
                            }
                        }
                    }
                }
                return {user: {...i}, server: server}
            })
            return result
        }
    }
}