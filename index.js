    const fastify = require('fastify')({
        logger: false,
        trustProxy: true,
    })
    const fastifyCors = require('@fastify/cors')
    const fastifyRateLimit = require('@fastify/rate-limit')

    const { createClient } = require('@supabase/supabase-js');
    const config = require('./resources/config.json')
    const supabase = createClient(
        config.supabase.url,
        config.supabase.serviceKey
    )

    const fs = require("fs")
    const { register } = require('module')
    const path = require('path')

    fastify.register(fastifyCors, {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    })

    fastify.register(fastifyRateLimit, {
        max: 60,
        timeWindow: '1 minute'
    })

    fastify.addHook('onSend', async (req, reply, payload) => {
        reply.header('Access-Control-Allow-Origin', '*');
        return payload;
    });

    const port = process.env.PORT || 3000;

    fastify.listen({ port, host: '0.0.0.0' }, (err, address) => {
        if (err) throw err;
        console.log(`📣 Fastify running on ${address}`)
    })

    fastify.addHook("preValidation", async(req, reply) => {
        const package = getPackage(req, reply)
        const data = (await package.supabaseAPI("get", "data")).at(-1)
        const manifest = req.body?.manifest
        if(!manifest) {
            return reply.status(400).send({ error: "Bad Request" });
        }
        if(Number(manifest.version) < data.version) {
            return reply.status(426).send({ error: "version is low" });
        }
    })

    fastify.addHook("preHandler", async (req, reply) => {
        const package = getPackage(req, reply)
        req.account = await package.robloxAPI("authorization", req.headers["rosecurity"])
        req.grade = (await package.supabaseAPI("get", "memberList")).find(i => i.id == req.account.id)?.grade
        if(!req.grade) req.grade = 1
        if (req.url == "/register") {
            if(!req.account) {
                return reply.status(401).send({ error: "Unauthorized" })
            }
        }
        else {
            const tokens = await package.supabaseAPI("get", "tokens")
            const token = tokens.find(i => req.headers["token"] == i.token)
            if (!token) {
                return reply.status(401).send({ error: "No token" })
            }
        }
    })

    fastify.addHook("onResponse", async (req, reply) => {
        const package = getPackage(req, reply)
        console.log(`✅ ${req.url} (${req.ip}) 요청 성공! [코드: ${reply.statusCode}]`)
    })

    fastify.addHook("onError", async (req, reply, error) => {
        const package = getPackage(req, reply)
        console.log(`❌ ${req.url} (${req.ip}) 요청 실패! [코드: ${error.statusCode}, 메세지: ${error.message}]`)
    })

    fastify.get("/app", async(req, reply) => {
        const html = fs.readFileSync("./resources/app.html")
        return reply.header('Content-Type', 'text/html; charset=utf-8').send(html)
    })

    fastify.post("/register", async(req, reply) => {
        const package = getPackage(req, reply)
        const token = package.createToken(30, 10)
        
        const data = {
            expire: token.expire,
            token: token.token,
            type: 1,
            rosecurity: req.headers["rosecurity"],
            account: req.account,
            grade: req.grade,
            position: req.ip,
            href: req.body.href
        }
        if(req.grade == 4) {
            console.log("삽입됨")
            await package.supabaseAPI("insert", "tokens", {
                expire: data.expire,
                token: data.token,
                type: data.type,
                grade: data.grade
            })
        }
        else {
            await package.supabaseAPI("insert", "tokens", data)
        }
        return data
    })

    fastify.post("/batch/:name", async(req, reply) => {
        const package = getPackage(req, reply)
        const name = req.params.name;
        
        if(name == "list") {
            const memberList = await package.supabaseAPI("get", "memberList")
            const teamerList = await package.supabaseAPI("get", "teamerList")
            const [memberDataList, memberImgList, teamerDataList, teamerImgList] = await Promise.all([
            package.robloxAPI("users", memberList.map(i => i.id)),
            package.robloxAPI("thumbnails", {target: memberList.map(i => ({targetId: i.id})), format: {
                type: "AvatarHeadShot",
                size: "150x150",
                format: "png",
                isCircular: true
            }}),
            package.robloxAPI("users", teamerList.map(i => i.id)),
            package.robloxAPI("thumbnails", {target: teamerList.map(i => ({targetId: i.id})), format: {
                type: "AvatarHeadShot",
                size: "150x150",
                format: "png",
                isCircular: true
            }})
            ])
            const memberFullList = memberList.map(i => ({
                ...i,
                img: memberImgList.find(j => j.targetId == i.id)?.imageUrl,
                ...memberDataList.find(j => j.id == i.id)
            }))
            const teamerFullList = teamerList.map(i => ({
                ...i,
                img: teamerImgList.find(j => j.targetId == i.id)?.imageUrl,
                ...teamerDataList.find(j => j.id == i.id)
            }))
            return {memberList: memberFullList, teamerList: teamerFullList}
        }
        else if(name == "country") {
            const country = await package.supabaseAPI("get", "country")
            return country
        }
        else if(name == "ipList") {
            const ips = await package.supabaseAPI("get", "ips")
            return ips
        }
        else if(name == "language") {
            const languagePack = await package.supabaseAPI("get", "language")
            const language = req.body.language
            const converted = Object.assign({}, ...languagePack.map(item => ({
                [item.key]: item[language] || item["en"]
            })))
            return converted
        }
        return reply.status(404).send({ error: "Not Found!" });
    })

    fastify.post("/apis", async(req, reply) => {
        const package = getPackage(req, reply)
        return (await package.robloxAPI(req.body.type, req.body.input))
    })

    fastify.post("/search", async(req, reply) => {
        const package = getPackage(req, reply)
        return (await package.searchObject(req.body.placeId, req.body.id))
    })

    fastify.post("/add", async(req, reply) => {
        const package = getPackage(req, reply)
        if(req.grade < 2) {
            return reply.status(401).send({ error: "forbidden" });
        }
        return (await package.supabaseAPI("insert", "teamerList", {
            id: req.body.id,
            reason: req.body.reason,
            country: req.body.country
        }))
    })

    fastify.post("/ip", async(req, reply) => {
        const package = getPackage(req, reply)
        if(req.grade < 3) {
            return reply.status(401).send({ error: "forbidden" });
        }
        const before = await package.supabaseAPI("get", "ips")
        const is = before.some(i => i.ip == req.body.ip)
        if(!is) {
            await package.supabaseAPI("insert", "ips", {
                ip: req.body.ip,
                data: req.body.data
            })
        }
        return is
    })

    function getPackage(req, reply) {
        function createToken(length, duration) {
            let key = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789~!@$%^&*()-_=+[]{}|;:,<.>/?"
            let token = ""
            for(let i=0;i<length;i=i+1) {   
            token = token + key[Math.floor(Math.random()*key.length)]
            }
            const now = new Date();
            const expire = new Date(now.getTime() + duration * 60 * 1000)
            return {token,expire}
        }
    
        async function supabaseAPI(type, table, data) {
            if(type == "get") {
                const res = await supabase.from(table).select("*")
                return res.data
            }

            if(type == "insert") {
                const res = await supabase.from(table).insert(data).select()
                return res
            }
        }

        function sliceArray(array, chunkSize) {
            const result = []
            for (let i = 0; i < array.length; i += chunkSize) {
                result.push(array.slice(i, i + chunkSize))
            }
            return result
        }

        async function fetchGeneral(url, options) {
            let req = null
            for(let i=5;i>0;i=i-1) {
                req = await fetch(url, options)
                if(req.status == 200) {
                    break 
                }
                else {
                    if(req.status == 429) {
                        const cooltime = Number(req.headers.get("Retry-After"))*1000
                        await new Promise(resolve => setTimeout(resolve, cooltime))
                    }
                    else {
                        await new Promise(resolve => setTimeout(resolve, 1000))
                    }
                }
            }
            const res = await req.json()
            return res
        }

        async function parseServer(list, format) {
            const servers = list.map(i => {
                const random = String(Math.floor(Math.random()*10000))
                const tokens = i.playerTokens.map(j => ({token: j, jobId: i.id, requestId: random}))
                return {...i, tokens, random}
            })
            const thumbnails = await robloxAPI("thumbnails", {target: servers.map(i => i.tokens).flat(), format: format})
            const res = servers.map(i => {
                return {
                    id: i.id,
                    ping: i.ping,
                    fps: i.fps,
                    maxPlayers: i.maxPlayers,
                    playing: i.playing,
                    players: i.players,
                    playerImgs: thumbnails.filter(j => j.requestId == i.random).map(j => j?.imageUrl)
                }
            })
            return res
        }

        async function robloxAPI(type, input) {
            const headers = {
                "Content-Type": "application/json",
                'Cookie': `.ROBLOSECURITY=${req.headers["rosecurity"]}`
            }
            let res = null
            if(type == "authorization") {
                res = await fetchGeneral(
                    `https://users.roblox.com/v1/users/authenticated`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        'Cookie': `.ROBLOSECURITY=${input}`
                    }
                })
            }
            else if(type == "usernames") {
                const arr = sliceArray(input, 100)
                res = (await Promise.all(arr.map(async(i) => {
                    const req = await fetchGeneral(
                        `https://users.roblox.com/v1/usernames/users`, {
                        method: "POST",
                        headers: headers,
                        body: JSON.stringify({
                            usernames: i,
                            excludeBannedUsers: false
                        })
                    })
                    return req.data
                }))).flat()
            }
            else if(type == "presence") {
                const arr = sliceArray(input, 50)
                res = (await Promise.all(arr.map(async(i) => {
                    const req = await fetchGeneral(
                        `https://presence.roblox.com/v1/presence/users`, {
                            method: "POST",
                            headers: headers,
                            body: JSON.stringify({
                                userIds: i
                            })
                        }
                    )
                    return req.userPresences
                }))).flat()
            }
            else if(type == "thumbnails") {
                let batchList = null
                if(input.format) {
                    batchList = input.target.map(j => ({
                        ...j,
                        ...input.format
                    }))
                }
                else {
                    batchList = [...input.target].map(j => ({
                        ...j,
                        type: "AvatarHeadShot",
                        size: "150x150",
                        format: "png",
                        isCircular: false
                    }))
                }
                const arr = sliceArray(batchList, 100)
                res = (await Promise.all(arr.map(async(i) => {
                    const req = await fetchGeneral(
                        `https://thumbnails.roblox.com/v1/batch`, {
                            method: "POST",
                            headers: headers,
                            body: JSON.stringify(i)
                        }
                    )
                    return req.data.map(j => ({
                        ...j,
                        imageUrl: j.imageUrl || "https://cdn-icons-png.flaticon.com/512/9517/9517948.png"
                    }));
                }))).flat()
            }
            else if(type == "users") {
                res = await Promise.all(input.map(i => (fetchGeneral(
                    `https://users.roblox.com/v1/users/${i}`, {
                        method: "GET",
                        headers: headers
                    }
                ))))
            }
            else if(type == "friends") {
                res = await Promise.all(input.map(i => (fetchGeneral(
                    `https://friends.roblox.com/v1/users/${i}/friends`, {
                        method: "GET",
                        headers: headers
                    }
                ))))
            }
            else if(type == "server") {
                const link = (input.cursor)
                    ? `https://games.roblox.com/v1/games/${input.placeId}/servers/public?limit=${input.limit}&cursor=${input.cursor}`
                    : `https://games.roblox.com/v1/games/${input.placeId}/servers/public?limit=${input.limit}`
                const server = await fetchGeneral(link, {
                    method: "GET",
                    headers: headers
                })
                const data = [...(await parseServer(server.data, input.format))]
                res = {nextPageCursor: server.nextPageCursor, previousPageCursor: server.previousPageCursor, data}
            }
            else if(type == "serverBatch") {
                let cursor = null
                const maxCount = Math.ceil(Number(input.count) / 100)
                server = []
                for(i=0;i<maxCount;i=i+1) {
                    const link = (cursor)
                        ? `https://games.roblox.com/v1/games/${input.placeId}/servers/public?limit=100&cursor=${cursor}`
                        : `https://games.roblox.com/v1/games/${input.placeId}/servers/public?limit=100`
                    const req = await fetchGeneral(link, {
                        method: "GET",
                        headers: headers
                    })
                    server.push(...req.data)
                    cursor = req.nextPageCursor
                    if(!cursor) break
                }
                res = await parseServer(server, input.format)
            }
            else if(type == "serverDetail") {
                res = await Promise.all(input.map(i => (fetchGeneral(
                    `https://gamejoin.roblox.com/v1/join-game-instance`, {
                    method: "POST",
                    headers: {
                        'User-Agent': 'Roblox/WinInet',
                        ...headers
                    },
                    body: JSON.stringify({
                        placeId: i.placeId,
                        gameId: i.jobId
                    })
                }))))
            }
            else {
                throw new Error("No Type Found")
            }
            return res
        }

        async function searchObject(placeId, idList) {
            const [imgList, serverList] = await Promise.all([
                robloxAPI("thumbnails", {target: idList.map(i => ({targetId: i})), format: null}),
                robloxAPI("serverBatch", {placeId: placeId, count: Infinity})
            ])
            const list = []

            for(const i of imgList) {
                let match = null
                for(const j of serverList) {
                    if(j.playerImgs.includes(i.imageUrl) && i.imageUrl !== "https://cdn-icons-png.flaticon.com/512/9517/9517948.png") {
                        match = j
                        break
                    }
                }
                const res = {
                    user: {
                        id: i.targetId,
                        img: i.imageUrl
                    },
                    server: match
                }
                list.push(res)
            }

            return list
        }

        return {
            sliceArray,
            createToken,
            supabaseAPI,
            robloxAPI,
            searchObject
        }
    }