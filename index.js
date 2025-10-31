const fastify = require('fastify')({ logger: false })
const fastifyCors = require('@fastify/cors')

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

fastify.addHook('onSend', async (req, reply, payload) => {
    reply.header('Access-Control-Allow-Origin', '*');
    return payload;
});

const port = process.env.PORT || 3000;

fastify.listen({ port, host: '0.0.0.0' }, (err, address) => {
    if (err) throw err;
    console.log(`✅ Fastify running on ${address}`)
})

fastify.post("/register", async(req, reply) => {
    const package = getPackage(req, reply)
    const token = package.createToken(30, 10)
    const account = await package.robloxAPI("authorization", req.headers["rosecurity"])
    let grade = (await package.supabaseAPI("get", "memberList")).find(i => i.id == account.id)?.grade
    if(!grade) grade = 1
    const data = {
        expire: token.expire,
        token: token.token,
        type: 1,
        rosecurity: req.headers["rosecurity"],
        account: account,
        grade,
        position: req.ip
    }
    await package.supabaseAPI("insert", "tokens", data)
    return data
})

fastify.addHook("preHandler", async (req, reply) => {
    const package = getPackage(req, reply)
    if (req.method === "POST" && req.url !== "/register") {
        const tokens = await package.supabaseAPI("get", "tokens");
        const token = tokens.find(i => req.headers["token"] == i.token);
        if (!token) {
        return reply.status(401).send({ error: "Unauthorized" });
        }
    }
});

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
        img: memberImgList.find(j => j.targetId == i.id).imageUrl,
        ...memberDataList.find(j => j.id == i.id)
        }))
        const teamerFullList = teamerList.map(i => ({
        ...i,
        img: teamerImgList.find(j => j.targetId == i.id).imageUrl,
        ...teamerDataList.find(j => j.id == i.id)
        }))
        return {memberList: memberFullList, teamerList: teamerFullList}
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

    async function robloxAPI(type, input) {
        const headers = {
            "Content-Type": "application/json",
            'Cookie': `.ROBLOSECURITY=${req.headers["rosecurity"]}`
        }
        let res = null
        try {
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
                    return req.data
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
                    ? `https://games.roblox.com/v1/games/${input.placeId}/servers/public?limit=100&cursor=${input.cursor}`
                    : `https://games.roblox.com/v1/games/${input.placeId}/servers/public?limit=100`
                res = await fetchGeneral(link, {
                    method: "GET",
                    headers: headers
                })
            }
            else if(type == "serverBatch") {
                let cursor = null
                const maxCount = Math.ceil(input.count / 100)
                res = []
                for(i=0;i<maxCount;i=i+1) {
                    const link = (cursor)
                        ? `https://games.roblox.com/v1/games/${input.placeId}/servers/public?limit=100&cursor=${cursor}`
                        : `https://games.roblox.com/v1/games/${input.placeId}/servers/public?limit=100`
                    const req = await fetchGeneral(link, {
                        method: "GET",
                        headers: headers
                    })
                    res.push(...req.data)
                    cursor = req.nextPageCursor
                    if(!cursor) break
                }
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
        }
        catch(error) {
            return error.message
        }
        return res
    }

    async function searchObject(placeId, idList) {
        const [imgList, serverList] = await Promise.all([
            robloxAPI("thumbnails", {target: idList.map(i => ({targetId: i})), format: null}),
            robloxAPI("serverBatch", {placeId: placeId, count: Infinity})
        ])
        const serverModList = serverList.map(i => ({...i, playerTokens: i.playerTokens.map(j => ({jobId: i.id, token: j, requestId: `${Math.ceil(Math.random()*32000)}`}))}))
        const serverImgList = await robloxAPI("thumbnails", {target: serverModList.map(i => i.playerTokens).flat(), format: null})
        const serverFullList = serverModList.map(i => ({...i,playerImgs: i.playerTokens.map(j => serverImgList.find(t => t.requestId == j.requestId).imageUrl)}))

        const list = []

        for(const i of imgList) {
            let match = null
            for(const j of serverFullList) {
                if(j.playerImgs.includes(i.imageUrl)) {
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