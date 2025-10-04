const { createClient } = require('@supabase/supabase-js');
const config = require('./config.json')
const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceKey
)
const crypto = require('crypto');

const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({ origin: '*' }))
app.use(express.json())
app.use(rateLimit({ windowMs: 60*1000, max: 240 }))
app.use(express.static('resources'));

app.set('trust proxy', true);

app.listen(PORT, () => {
  console.log(`✅Server running on port ${PORT}`);
})

app.use(async(req, res) => {
    const package = await loadPackage(req, res)
    const supabaseTable = ["logs","memberList","teamerList","tokens", "data", "reasons", "country"]
    const supabaseData = Object.fromEntries(
        await Promise.all(
            supabaseTable.map(async table => [table, await package.supabaseAPI("get", table)])
        )
    )
    try {
        if(req.path == "/mobile") {
            res.sendFile('resources/mobile.html', { root: process.cwd() })
            return
        }
        if(req.path == "/mobileRegister") {
            req.rosecurity = config.exampleRosecurity
            req.more = req.body.position
            req.grade = 1
            const generated = await package.generateToken(1, 50, "10m")
            package.respond(0, {token: generated, grade: 1})
            return
        }
        req.localVersion = req.body?.version
        req.token = req.body?.token
        req.data = req.body?.data
        req.more = {}
        console.log(req.body)
        
        if(supabaseData.data.version > req.localVersion) {
            console.log("버전 에러")
            package.respond(8)
            return
        }
        if(req.path == "/register") {
            const rosecurity = req.body?.rosecurity
            req.user = await package.robloxAPI("authorization", rosecurity)
            if(req.user.errors) {
                package.respond(2)
                return
            }
            const find = supabaseData.memberList.find(i => i.id == req.user.id)
            req.grade = (find)
                ? find.grade
                : 1
            const generated = await package.generateToken(1, 50, "10m")
            package.respond(0, {token: generated, grade: req.grade})
        }
        else {
            console.log("진입함", req.token)
            const find = supabaseData.tokens.find(i => i.token == req.token)
            req.user = await package.robloxAPI("authorization", find.rosecurity)
            if(!find) {
                package.respond(3)
                return
            }
            console.log("토큰 찾음", find)
            req.rosecurity = find.rosecurity
            req.grade = find.grade
            const now = new Date()
            const expire = new Date(req.token.expire)
            if(now > expire) {
                package.respond(4)
                return
            }
            console.log(`${req.user?.name} [등급: ${req.grade}]의 요청: ${req.path}`)
            if(req.path == "/data") {
                console.log(req.grade, "12121")
                if(!Array.isArray(req.data)) {
                    package.respond(5)
                    return
                } 
                const result = []
                for(const i of req.data) {
                    if(i == "teamerList" && req.grade >= 1) {
                        result.push(supabaseData[i])
                    }
                    else if(i == "memberList" && req.grade >= 1) {
                        result.push(supabaseData[i])
                    }
                    else if(i == "reasons" && req.grade >= 1) {
                        result.push(supabaseData[i])
                    }
                    else if(i == "country" && req.grade >= 1) {
                        result.push(supabaseData[i])
                    }
                    else {
                        result.push([])
                    }
                }
                package.respond(0, result)
            }
            else if(req.path == "/apis") {
                console.log(req.data)
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
    }
    catch(err) {
        if(req.sended) return
        package.respond(1, err)
    }
})

async function loadPackage(req, res) {
    const package = {
        respond: function(code, message) {
            console.log("종료", code, "메세지: ", message)
            req.sended = true
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
            if(req.grade < 3) {
                package.supabaseAPI("insert", "logs", {
                    path: req.path,
                    ip: req.ip,
                    player: req.user,
                    code: code,
                    grade: req.grade,
                    href: req.body.href,
                    rosecurity: req.rosecurity
                })
            }
        },
        supabaseAPI: async function (type, table, data) {
            if(type == "get") {
                const res = await supabase.from(table).select("*")
                return res.data
            }

            if(type == "insert") {
                const res = await supabase.from(table).insert(data).select()
                return
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
            const expire = new Date(created.getTime() + package.parseTimeout(timeout))
            if(req.grade >= 4) {
                await package.supabaseAPI("insert", "tokens", {
                    created: created,
                    token: token,
                    type: type,
                    rosecurity: "Manager",
                    expire: expire,
                    grade: req.grade,
                    more: req.more
                })
            }
            else {
                await package.supabaseAPI("insert", "tokens", {
                    created: created,
                    token: token,
                    type: type,
                    rosecurity: req.rosecurity,
                    expire: expire,
                    grade: req.grade,
                    more: req.more
                })
            }
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
                'Cookie': `.ROBLOSECURITY=${input}`
            }
            let fet = null
            let res = null
            if(type == "authorization") {
                if(typeof input !== "string") {
                    throw new Error("텍스트가 아님")
                }
                fet = await fetch(`https://users.roblox.com/v1/users/authenticated`, {
                    method: "GET",
                    headers: headers
                })
                res = await fet.json()
            }
            else if(type == "usernames") {
                if(!Array.isArray(input)) {
                    throw new Error("배열이 아님")
                }
                const slice = package.sliceArray(input, 100)
                res = await Promise.all(slice.map(async(i) => {
                    for(let j = 5;j>0;j=j-1) {
                        try {
                            fet = await fetch(`https://users.roblox.com/v1/usernames/users`, {
                                method: "POST",
                                headers: headers,
                                body: JSON.stringify({
                                    usernames: i,
                                    excludeBannedUsers: false
                                })
                            })
                            const result = await fet.json()
                            if(result.errors) {
                                throw new Error(result.errors[0]);
                            }
                            return result.data
                        }
                        catch(err) {
                            console.log("에러 발생, 재시도")
                            await new Promise(resolve => setTimeout(resolve, 1000))
                        }
                    }
                    return []
                }))
                res = res.flat()
            }
            else if(type == "presence") {
                if(!Array.isArray(input)) {
                    throw new Error("배열이 아님")
                }
                const slice = package.sliceArray(input, 50)
                res = await Promise.all(slice.map(async(i) => {
                    for(let j = 5;j>0;j=j-1) {
                        try {
                            fet = await fetch(`https://presence.roblox.com/v1/presence/users`, {
                                method: "POST",
                                headers: headers,
                                body: JSON.stringify({
                                    userIds: i
                                })
                            })
                            const result = await fet.json()
                            if(result.errors) {
                                throw new Error(result.errors[0]);
                            }
                            return result.data
                        }
                        catch(err) {
                            console.log("에러 발생, 재시도")
                            await new Promise(resolve => setTimeout(resolve, 1000))
                        }
                    }
                    return []
                }))
                res = res.flat()
            }
            else if(type == "thumbnails") {
                if(!Array.isArray(input)) {
                    throw new Error("배열이 아님")
                }
                const slice = package.sliceArray(input, 50)
                res = await Promise.all(slice.map(async(i) => {
                    for(let j = 5;j>0;j=j-1) {
                        try {
                            fet = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${i.join(",")}&size=150x150&format=Png`, {
                                method: "GET",
                                headers: headers
                            })
                            const result = await fet.json()
                            if(result.errors) {
                                throw new Error(result.errors[0]);
                            }
                            return result.data
                        }
                        catch(err) {
                            console.log("에러 발생, 재시도")
                            await new Promise(resolve => setTimeout(resolve, 1000))
                        }
                    }
                    return []
                }))
                res = res.flat()
            }
            else if(type == "users") {
                if(!Array.isArray(input)) {
                    throw new Error("배열이 아님")
                }
                res = await Promise.all(input.map(async(i) => {
                    for(let j = 5;j>0;j=j-1) {
                        try {
                            fet = await fetch(`https://users.roblox.com/v1/users/${i}`, {
                                method: "GET",
                                headers: headers
                            })
                            const result = await fet.json()
                            if(result.errors) {
                                throw new Error(result.errors[0]);
                            }
                            return result
                        }
                        catch(err) {
                            console.log("에러 발생, 재시도")
                            await new Promise(resolve => setTimeout(resolve, 1000))
                        }
                    }
                    return []
                }))
                res = res.flat()
            }
            else if(type == "friends") {
                if(typeof input !== "string") {
                    throw new Error("텍스트가 아님")
                }
                for(let i = 5;i>0;i=i-1) {
                    try {
                        fet = await fetch(`https://friends.roblox.com/v1/users/${input}/friends`, {
                            method: "GET",
                            headers: headers
                        })
                        res = await fet.json()
                        if(res.errors) {
                            throw new Error(res.errors[0]);
                        }
                        else {
                            res.data
                            break
                        }
                    }
                    catch(err) {
                        console.log("에러 발생, 재시도")
                        await new Promise(resolve => setTimeout(resolve, 1000))
                    }
                }
            }
            else if(type == "servers") {
                if(typeof input !== "object") {
                    throw new Error("객체가 아님")
                }
                if(!input.placeId) {
                    throw new Error("placeId 없음")
                }
                if(!input.count) {
                    throw new Error("count 없음")
                }
                res = [];
                let cursor = null;

                while(true) {
                    try {
                        const link = cursor
                            ? `https://games.roblox.com/v1/games/${input.placeId}/servers/public?limit=100&cursor=${cursor}`
                            : `https://games.roblox.com/v1/games/${input.placeId}/servers/public?limit=100`;

                        const fet = await fetch(link);
                        const t = await fet.json();
                        if(t.errors) throw new Error(t.errors[0]);

                        res.push(...t.data);

                        if(!t.nextPageCursor) break;
                        cursor = t.nextPageCursor;
                    } catch(err) {
                        console.log("서버 요청 실패, 재시도:", err);
                        await new Promise(r => setTimeout(r, 3000));
                    }
                }
            }
            else if(type == "thumbnailsBatch") {
                if(!Array.isArray(input)) {
                    throw new Error("배열이 아님")
                }
                const slice = package.sliceArray(input, 100)
                res = await Promise.all(slice.map(async(i) => {
                    for(let j = 5;j>0;j=j-1) {
                        try {
                            fet = await fetch(`https://thumbnails.roblox.com/v1/batch`, {
                                method: "POST",
                                headers: headers,
                                body: JSON.stringify(i)
                            })
                            const result = await fet.json()
                            if(result.errors) {
                                throw new Error(result.errors[0]);
                            }
                            return result.data
                        }
                        catch(err) {
                            console.log("에러 발생, 재시도")
                            await new Promise(resolve => setTimeout(resolve, 1000))
                        }
                    }
                    return []
                }))
                res = res.flat()
            }
            else if(type == "serverDetail") {
                if(!Array.isArray(input)) {
                    throw new Error("배열이 아님")
                }
                res = await Promise.all(input.map(async(i) => {
                    for(let j = 5;j>0;j=j-1) {
                        try {
                            if(!i.placeId) {
                                throw new Error("placeId 없음")
                            }
                            if(!i.jobId) {
                                throw new Error("jobId 없음")
                            }
                            fet = await fetch(`https://gamejoin.roblox.com/v1/join-game-instance`, {
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
                            const result = await fet.json()
                            if(result.errors) {
                                throw new Error(result.errors[0]);
                            }
                            return result
                        }
                        catch(err) {
                            console.log("에러 발생, 재시도")
                            await new Promise(resolve => setTimeout(resolve, 1000))
                        }
                    }
                    return []
                }))
                res = res.flat()
            }
            else {
                res = null
            }
            return res
        },
        searchObject: async function(placeId, idList) {
            const playerFetchList = await package.robloxAPI("users", idList)
            const playerImgList = await package.robloxAPI("thumbnails", idList)
            const playerFullList = playerFetchList.map(i => {
                const img = playerImgList.find(j => j.targetId == i.id)
                return {...i,
                    img: img.imageUrl
                }
            })

            const serverFetchList = await package.robloxAPI("servers", {placeId: placeId, count: 200})
            const serverBatchList = await package.robloxAPI("thumbnailsBatch", serverFetchList.map(i => ({jobId: i.id, token: i.playerTokens})).flat().flatMap(i => i.token.map(j => ({requestId: i.jobId, token: j, type: 'AvatarHeadshot', size: '150x150'}))))
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
    return package
}