const version = 20;
(async() => {
    window.test = true
    const placeId = "8573962925"
    console.log("✅mobile.js loaded")
    const background = document.createElement("div")
    background.style.position = "fixed"
    background.style.display = "flex"
    background.style.width = "100%"
    background.style.height = "80%"
    background.style.backgroundColor = "rgba(54, 142, 0, 1)"
    background.style.top = "0"
    background.style.left = "0"
    background.style.padding = "20px"
    background.style.justifyContent = "flex-start"
    background.style.alignItems = "center"
    background.style.flexDirection = "column"

    const label = document.createElement("label")
    label.style.position = "relative"
    label.style.display = "flex"
    label.style.color = "black"
    label.style.fontSize = "50px"

    document.body.appendChild(background)
    background.appendChild(label)

    label.innerText = "IP 정보를 가져오는중..."

    navigator.geolocation.getCurrentPosition(
    async(position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        console.log("Latitude: " + latitude);
        console.log("Longitude: " + longitude);
        label.innerText = "완료"
        await new Promise(res => setTimeout(res, 1000))
        label.innerText = "토큰 가져오는 중"
        const package = await loadPackage()
        window.position = {latitude: latitude, longitude: longitude}
        const register = await package.serverRegister()
        window.serverToken = register.token
        await new Promise(res => setTimeout(res, 500))
        label.innerText = `토큰: ${window.serverToken}`
        label.style.fontSize = "20px"
        await new Promise(res => setTimeout(res, 1000))
        label.innerText = "추적기 준비중"

        await new Promise(res => setTimeout(res, 1000))

        label.innerText = "AB에서 검색할 사람을 입력해주세요"

        const instances = background
            
        const panelContainer = document.createElement("div")
        panelContainer.style.display = "flex"
        panelContainer.style.flexDirection = "column"
        panelContainer.style.gap = "5px"

        const panelMain = document.createElement("div")
        panelMain.className = "vp-panelMain"
        panelMain.style.position = "relative"
        panelMain.style.display = "flex"
        panelMain.style.width = "500px"
        panelMain.style.height = "100px"
        panelMain.style.justifyContent = "flex-start"
        panelMain.style.alignItems = "center"
        panelMain.style.backgroundColor = "rgba(223, 223, 223, 1)"
        panelMain.style.color = "black"
        panelMain.style.padding = "10px"
        panelMain.style.gap = "5px"

        const panelUser = document.createElement("img")
        panelUser.className = "vp-panelMain"
        panelUser.style.position = "relative"
        panelUser.style.display = "flex"
        panelUser.style.height = "100%"
        panelUser.src = "./user.png"

        const panelInput = document.createElement("input")
        panelInput.className = "vp-panelInput"
        panelInput.style.position = "relative"
        panelInput.style.display = "flex"
        panelInput.style.width = "310px"
        panelInput.style.height = "100%"
        panelInput.style.justifyContent = "center"
        panelInput.style.alignItems = "center"
        panelInput.style.backgroundColor = "rgba(230, 230, 230, 1)"
        panelInput.style.color = "black"
        panelInput.style.border = "5px solid"
        panelInput.style.borderColor = "rgba(197, 197, 197, 1)"
        panelInput.style.borderRadius = "5px"
        panelInput.placeholder = "닉네임을 입력하시요"

        const panelSearchBase = document.createElement("button")
        panelSearchBase.className = "vp-panelSearchBase"
        panelSearchBase.style.position = "relative"
        panelSearchBase.style.display = "flex"
        panelSearchBase.style.justifyContent = "center"
        panelSearchBase.style.alignItems = "center"
        panelSearchBase.style.backgroundColor = "rgba(227, 227, 227, 1)"
        panelSearchBase.style.width = "80px"
        panelSearchBase.style.height = "100%"
        panelSearchBase.style.border = "5px solid"
        panelSearchBase.style.borderColor = "rgba(197, 197, 197, 1)"
        panelSearchBase.style.borderRadius = "5px"

        const panelSearch = document.createElement("img")
        panelSearch.className = "vp-panelSearch"
        panelSearch.style.position = "relative"
        panelSearch.style.display = "flex"
        panelSearch.style.justifyContent = "center"
        panelSearch.style.alignItems = "center"
        panelSearch.style.color = "black"
        panelSearch.style.height = "100%"
        panelSearch.src = "./search.png"

        const buttonWrapper = document.createElement("div")
        buttonWrapper.style.position = "relative"
        buttonWrapper.style.display = "flex"
        buttonWrapper.style.gap = "5px"

        instances.appendChild(panelContainer)
        panelContainer.appendChild(panelMain)
        panelMain.appendChild(panelUser)
        panelMain.appendChild(panelInput)
        panelMain.appendChild(panelSearchBase)
        panelSearchBase.appendChild(panelSearch)
        panelContainer.appendChild(buttonWrapper)

        let searching = false
        panelSearchBase.addEventListener("click", async() => {
            if(searching) return
            searching = true
            panelContainer.querySelectorAll('.vp-serverContainer').forEach(e => e.remove())
            panelSearchBase.style.backgroundColor = "rgba(165, 244, 255, 1)"
            let userFet = []
            const data = panelInput.value.split(',')
            userFet = (await package.serverAPI("/apis", {type: "users", content: data})).map(i => i.id)

            const search = await doSearch(userFet)
            const hasResult = search.find(i => i.server)
            if(hasResult) {
                const audio = new Audio('./success.mp3')
                audio.play()
                panelUser.src = "./user-success.png"
            }
            else {
                const audio = new Audio('./error.mp3')
                audio.play()
                panelUser.src = "./user-error.png"
            }
            panelSearchBase.style.backgroundColor = "rgba(227, 227, 227, 1)"
            searching = false
            for(const i of search) {
                if(i.server) addOb(i)
            }
        })

        async function doSearch(data) {
            const track = await package.serverAPI("/track", {placeId: placeId, content: data})
            return track
        }
        async function addOb(data) {
            const serverContainer = document.createElement("div")
            serverContainer.className = "vp-serverContainer"
            serverContainer.style.position = "relative"
            serverContainer.style.display = "flex"
            serverContainer.style.justifyContent = "flex-start"
            serverContainer.style.alignItems = "center"
            serverContainer.style.backgroundColor = "rgba(227, 227, 227, 1)"
            serverContainer.style.color = "black"
            serverContainer.style.width = "805px"
            serverContainer.style.height = "170px"
            serverContainer.style.border = "5px solid"
            serverContainer.style.borderColor = "rgba(167, 167, 167, 1)"
            serverContainer.style.borderRadius = "5px"
            serverContainer.style.gap = "5px"

            const serverLeft = document.createElement("div")
            serverLeft.className = "vp-serverLeft"
            serverLeft.style.position = "relative"
            serverLeft.style.display = "flex"
            serverLeft.style.justifyContent = "center"
            serverLeft.style.alignItems = "center"
            serverLeft.style.backgroundColor = "rgba(208, 208, 208, 1)"
            serverLeft.style.color = "black"
            serverLeft.style.width = "400px"
            serverLeft.style.height = "100%"
            serverLeft.style.flexDirection = "column"

            const serverUserImg = document.createElement("img")
            serverUserImg.style.height = "70px"
            serverUserImg.src = data.user.img

            const serverUser = document.createElement("label")
            serverUser.style.color = "rgba(53, 53, 53, 1)"
            serverUser.innerText = `${data.user.displayName} (@${data.user.name})`

            const join = document.createElement("button")
            join.className = "vp-join"
            join.style.position = "relative"
            join.style.display = "flex"
            join.style.justifyContent = "center"
            join.style.alignItems = "center"
            join.style.backgroundColor = "rgba(227, 227, 227, 1)"
            join.style.color = "black"
            join.style.width = "200px"
            join.style.height = "50px"
            join.style.border = "5px solid"
            join.style.borderColor = "rgba(167, 167, 167, 1)"
            join.style.borderRadius = "5px"
            join.innerText = "참가하기"
            join.addEventListener("click", () => {
                package.sendMessage("runRoblox", {placeId: placeId, jobId: data.server.jobId})
            })

            const serverRight = document.createElement("div")
            serverRight.className = "vp-serverRight"
            serverRight.style.position = "relative"
            serverRight.style.display = "flex"
            serverRight.style.justifyContent = "center"
            serverRight.style.alignItems = "center"
            serverRight.style.backgroundColor = "rgba(208, 208, 208, 1)"
            serverRight.style.color = "black"
            serverRight.style.width = "100%"
            serverRight.style.height = "100%"
            serverRight.style.gap = "5px"

            for(const i of data.server.img) {
                const serverImg = document.createElement("img")
                serverImg.style.height = "100px"
                serverImg.src = i
                serverRight.appendChild(serverImg)
            }

            panelContainer.appendChild(serverContainer)
            serverContainer.appendChild(serverLeft)
            serverLeft.appendChild(serverUserImg)
            serverLeft.appendChild(serverUser)
            serverLeft.appendChild(join)
            serverContainer.appendChild(serverRight)
        }
    })
})()

async function loadPackage() {
    let serverUrl = null
    if(window.test) {
        serverUrl = 'http://localhost:3000'
    }
    else {
        serverUrl = 'https://victory-path.onrender.com'
    }
    const funcs = {
        sendMessage: async function(action, content) {
            return new Promise(res => chrome.runtime.sendMessage({
                action: action,
                    content: content
                }, (response) => {
                    res(response)
                }
            ))
        },

        localStorageAPI: function (type, key, value) {
            return new Promise((resolve) => {
                if(type == "get") {
                    chrome.storage.local.get([key], (result) => {
                        resolve(result[key])
                    })
                }
                if(type == "set") {
                    chrome.storage.local.set({ [key]: value }, () => {
                        resolve(true)
                    })
                }
            })
        },

        waitForElm: function (selector) {
        return new Promise(resolve => {
            const element = document.querySelector(selector)
            if (element) {
                resolve(element)
                return element
            }

            const observer = new MutationObserver((mutations) => {
            const element = document.querySelector(selector)
            if (element) {
                resolve(element)
                observer.disconnect()
            }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            })
        })
        },

        executeScript:async function(file) {
            const res = await funcs.sendMessage("executeScript", file)
            return res
        },

        serverRegister: async function() {
            const fet = await fetch(`${serverUrl}/mobileRegister`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({position: window.position, version: version})
            })
            const res = await fet.json()
            console.log(res)
            return res.data
        },

        serverAPI: async function(path, data) {
            while(!window.serverToken) {
                await new Promise(res => setTimeout(res, 100))
            }
            let fet = await fetch(`${serverUrl}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({token: window.serverToken, data: data, version: version})
            })
            let res = await fet.json()
            if(res.code == 4) {
                const register = await funcs.serverRegister()
                console.log(register)
                window.serverToken = register.token
                fet = await fetch(`${serverUrl}${path}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({token: window.serverToken, data: data, version: version})
                })
                res = await fet.json()
            }

            if(res.success) {
                return res.data
            }
            else {
                return res.errors
            }
        },
    }
    return funcs
}