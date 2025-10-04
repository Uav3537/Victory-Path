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

        const respond = await package.serverAPI("/data", ["teamerList", "memberList", "reasons", "country"])
        console.log(respond)

        package.teamerList = respond[0]
        package.memberList = respond[1]
        package.reasons = respond[2]
        package.country = respond[3]

        const teamerIdList = respond[0].map(i => i.id)
        const teamerImgList = await package.serverAPI("/apis", {type: "thumbnails", content: teamerIdList})
        const teamerDataList = await package.serverAPI("/apis", {type: "users", content: teamerIdList})
        const teamerFullList = respond[0].map(i => {
            const data = teamerDataList.find(j => j.id == i.id)
            const img = teamerImgList.find(j => j.targetId == i.id)?.imageUrl
            return {...i,...data, img: img}
        })

        const memberIdList = respond[1].map(i => i.id)
        const memberImgList = await package.serverAPI("/apis", {type: "thumbnails", content: memberIdList})
        const memberDataList = await package.serverAPI("/apis", {type: "users", content: memberIdList})
        const memberFullList = respond[1].map(i => {
            const data = memberDataList.find(j => j.id == i.id)
            const img = memberImgList.find(j => j.targetId == i.id)?.imageUrl
            return {...i,...data, img: img}
        })

        window.teamerFullList = teamerFullList
        window.memberFullList = memberFullList

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
        const li3 = document.createElement('button')
        li3.className = "vp-li"
        li3.style.position = "relative"
        li3.style.display = "flex"
        li3.style.width = "100%"
        li3.style.height = "40px"
        li3.style.justifyContent = "center"
        li3.style.alignItems = "center"
        li3.style.backgroundColor = "rgba(233, 233, 233, 1)"
        li3.style.color = "black"
        li3.style.border = "none"
        li3.innerText = "맴버목록"
        li3.addEventListener("click", async() => {
            const background = document.createElement("div")
            background.className = "vp-background"
            background.style.position = "fixed"
            background.style.display = "flex"
            background.style.width = "100%"
            background.style.height = "100%"
            background.style.justifyContent = "center"
            background.style.alignItems = "center"
            background.style.backgroundColor = "rgba(12, 12, 12, 0.5)"
            background.style.color = "black"
            background.style.top = "0"
            background.style.left = "0"
            background.style.zIndex = "9999"
            background.addEventListener("click", (e) => {
                if(e.target == background) {
                    background.remove()
                }
            })

            const main = document.createElement("ul")
            main.className = "vp-main"
            main.style.position = "relative"
            main.style.width = "700px"
            main.style.height = "500px"
            main.style.justifyContent = "center"
            main.style.alignItems = "center"
            main.style.backgroundColor = "rgba(255, 255, 255, 1)"
            main.style.color = "black"
            main.style.overflowX = "hidden"
            main.style.overflowY = "auto"
            main.style.gap = "10px"
            main.style.boxSizing = "border-box"

            document.body.appendChild(background)
            background.appendChild(main)

            while(!window.memberFullList) {
                await new Promise(res => setTimeout(res, 100))
            }

            for(const i of window.memberFullList) {
                const li = document.createElement("li")
                li.className = "vp-3-li"
                li.style.position = "relative"
                li.style.display = "flex"
                li.style.width = "100%"
                li.style.justifyContent = "flex-start"
                li.style.alignItems = "center"
                li.style.backgroundColor = "rgba(204, 204, 204, 1)"
                li.style.color = "black"
                li.style.border = "5px solid"
                li.style.borderColor = "rgba(171, 171, 171, 1)"
                li.style.borderRadius = "5px"
                li.style.flexDirection = "column"
                li.style.boxSizing = "border-box"

                const containerUp = document.createElement("div")
                containerUp.className = "vp-3-containerUp"
                containerUp.style.position = "relative"
                containerUp.style.display = "flex"
                containerUp.style.width = "100%"
                containerUp.style.justifyContent = "center"
                containerUp.style.alignItems = "center"

                const img = document.createElement("img")
                img.style.height = "50px"
                img.src = i.img

                const label = document.createElement("label")
                label.color = "black"
                label.innerText = `${i.displayName} (@${i.name})`

                containerUp.addEventListener("click", (e) => {
                    const existing = li.querySelector('.vp-3-containerDown')
                    if (existing) {
                        existing.remove()
                        return
                    }
                    const containerDown = document.createElement("div")
                    containerDown.className = "vp-3-containerDown"
                    containerDown.style.position = "relative"
                    containerDown.style.display = "flex"
                    containerDown.style.width = "100%"
                    containerDown.style.justifyContent = "center"
                    containerDown.style.alignItems = "flex-start"
                    containerDown.style.backgroundColor = "rgba(187, 187, 187, 1)"
                    containerDown.style.color = "black"
                    containerDown.style.padding = "10px"

                    const description = document.createElement("div")
                    description.className = "vp-3-description"
                    description.style.position = "relative"
                    description.style.display = "flex"
                    description.style.width = "90%"
                    description.style.height = "150px"
                    description.style.justifyContent = "flex-start"
                    description.style.alignItems = "flex-start"
                    description.style.backgroundColor = "rgba(215, 215, 215, 1)"
                    description.style.color = "black"
                    description.style.padding = "10px"
                    description.innerText = i.description
                    if(i.description == "") {
                        description.innerText = "설명 없음"
                    }

                    li.appendChild(containerDown)
                    containerDown.appendChild(description)
                })

                main.appendChild(li)
                li.appendChild(containerUp)
                containerUp.appendChild(img)
                containerUp.appendChild(label)
            }
        })

        const li4 = document.createElement('button')
        li4.className = "vp-li"
        li4.style.position = "relative"
        li4.style.display = "flex"
        li4.style.width = "100%"
        li4.style.height = "40px"
        li4.style.justifyContent = "center"
        li4.style.alignItems = "center"
        li4.style.backgroundColor = "rgba(233, 233, 233, 1)"
        li4.style.color = "black"
        li4.style.border = "none"
        li4.innerText = "티밍목록"
        li4.addEventListener("click", async() => {
            const background = document.createElement("div")
            background.className = "vp-background"
            background.style.position = "fixed"
            background.style.display = "flex"
            background.style.width = "100%"
            background.style.height = "100%"
            background.style.justifyContent = "center"
            background.style.alignItems = "center"
            background.style.backgroundColor = "rgba(12, 12, 12, 0.5)"
            background.style.color = "black"
            background.style.top = "0"
            background.style.left = "0"
            background.style.zIndex = "9999"
            background.addEventListener("click", (e) => {
                if(e.target == background) {
                    background.remove()
                }
            })

            const main = document.createElement("ul")
            main.className = "vp-main"
            main.style.position = "relative"
            main.style.width = "700px"
            main.style.height = "500px"
            main.style.justifyContent = "center"
            main.style.alignItems = "center"
            main.style.backgroundColor = "rgba(255, 255, 255, 1)"
            main.style.color = "black"
            main.style.overflowX = "hidden"
            main.style.overflowY = "auto"
            main.style.gap = "10px"
            main.style.boxSizing = "border-box"

            const top = document.createElement("li")
            top.className = "vp-4-top"
            top.style.position = "relative"
            top.style.display = "flex"
            top.style.width = "100%"
            top.style.height = "70px"
            top.style.justifyContent = "center"
            top.style.alignItems = "center"
            top.style.backgroundColor = "rgba(204, 204, 204, 1)"
            top.style.color = "black"
            top.style.border = "5px solid"
            top.style.borderColor = "rgba(171, 171, 171, 1)"
            top.style.borderRadius = "5px"
            top.style.flexDirection = "column"
            top.style.boxSizing = "border-box"
            top.innerText = "박제하기"
            top.style.marginBottom = "5px"

            top.addEventListener("click", () => {
                if(!(package.grade >= 1)) {
                    top.innerText = "권한 부족"
                    return
                }
                background.remove()

                const background2 = document.createElement("div")
                background2.className = "vp-background"
                background2.style.position = "fixed"
                background2.style.display = "flex"
                background2.style.width = "100%"
                background2.style.height = "100%"
                background2.style.justifyContent = "center"
                background2.style.alignItems = "center"
                background2.style.backgroundColor = "rgba(12, 12, 12, 0.5)"
                background2.style.color = "black"
                background2.style.top = "0"
                background2.style.left = "0"
                background2.style.zIndex = "9999"
                background2.addEventListener("click", (e) => {
                    if(e.target == background2) {
                        background2.remove()
                    }
                })

                const main2 = document.createElement("div")
                main2.className = "vp-main"
                main2.style.position = "relative"
                main2.style.display = "flex"
                main2.style.width = "1000px"
                main2.style.height = "700px"
                main2.style.justifyContent = "flex-start"
                main2.style.alignItems = "flex-start"
                main2.style.backgroundColor = "rgba(255, 255, 255, 1)"
                main2.style.color = "black"
                main2.style.padding = "10px"
                main2.style.gap = "10px"
                main2.style.flexDirection = "column"

                const inputMain = document.createElement("div")
                inputMain.className = "vp-inputMain"
                inputMain.style.position = "relative"
                inputMain.style.display = "flex"
                inputMain.style.width = "400px"
                inputMain.style.height = "70px"
                inputMain.style.justifyContent = "flex-start"
                inputMain.style.alignItems = "center"
                inputMain.style.backgroundColor = "rgba(223, 223, 223, 1)"
                inputMain.style.color = "black"
                inputMain.style.padding = "10px"
                inputMain.style.gap = "5px"

                const inputUser = document.createElement("img")
                inputUser.className = "vp-inputUser"
                inputUser.style.position = "relative"
                inputUser.style.display = "flex"
                inputUser.style.height = "100%"
                inputUser.src = chrome.runtime.getURL("resources/user.png")

                const input = document.createElement("input")
                input.className = "vp-input"
                input.style.position = "relative"
                input.style.display = "flex"
                input.style.width = "300px"
                input.style.height = "100%"
                input.style.justifyContent = "center"
                input.style.alignItems = "center"
                input.style.backgroundColor = "rgba(230, 230, 230, 1)"
                input.style.color = "black"
                input.style.border = "5px solid"
                input.style.borderColor = "rgba(197, 197, 197, 1)"
                input.style.borderRadius = "5px"
                input.placeholder = "닉네임을 입력하세요"
                input.addEventListener("keydown", async(event) => {
                    if(event.key == "Enter") {
                        input.blur()
                    }
                })
                let targetId = null
                input.addEventListener("blur", async() => {
                    if(input.value == "") return
                    const targetUser = (await package.serverAPI("/apis", {type: "usernames", content: [input.value]}))[0]
                    const targetImg = (await package.serverAPI("/apis", {type: "thumbnails", content: [targetUser.id]}))[0]
                    inputUser.src = targetImg.imageUrl
                    inputMain.style.backgroundColor = "rgba(5, 62, 0, 1)"
                    targetId = targetUser.id
                })

                let reasonClick = []

                const reasonUl = document.createElement("ul")
                reasonUl.style.width = "100%"
                reasonUl.style.height = "70px"
                reasonUl.style.display = "flex"
                reasonUl.style.gap = "5px"
                reasonUl.style.overflowY = "auto"

                for(const i of package.reasons) {
                    const reasonLi = document.createElement("li")
                    reasonLi.style.position = "relative"
                    reasonLi.style.display = "flex"
                    reasonLi.style.width = "150px"
                    reasonLi.style.height = "100%"
                    reasonLi.style.justifyContent = "center"
                    reasonLi.style.alignItems = "center"
                    reasonLi.style.backgroundColor = "rgba(230, 230, 230, 1)"
                    reasonLi.style.color = "black"
                    reasonLi.style.border = "5px solid"
                    reasonLi.style.borderColor = "rgba(197, 197, 197, 1)"
                    reasonLi.style.borderRadius = "5px"
                    reasonLi.innerText = i.name
                    reasonUl.appendChild(reasonLi)

                    reasonLi.addEventListener("click", () => {
                        if(reasonClick.includes(i)) {
                            const newReason = []
                            for(const j of reasonClick) {
                                if(j !== i) {
                                    newReason.push(j)
                                }
                            }
                            reasonClick = newReason
                            reasonLi.style.borderColor = "rgba(197, 197, 197, 1)"
                            return
                        }
                        reasonClick.push(i)
                        reasonLi.style.borderColor = "rgba(255, 6, 6, 1)"
                    })
                }

                const button = document.createElement("button")
                button.style.position = "relative"
                button.style.display = "flex"
                button.style.width = "150px"
                button.style.height = "50px"
                button.style.justifyContent = "center"
                button.style.alignItems = "center"
                button.style.backgroundColor = "rgba(230, 230, 230, 1)"
                button.style.color = "black"
                button.style.border = "5px solid"
                button.style.borderColor = "rgba(197, 197, 197, 1)"
                button.style.borderRadius = "5px"
                button.innerText = "추가하기"
                button.addEventListener("click", async() => {
                    if(!targetId) {
                        console.log("타겟 없음")
                        return
                    }
                    if(reasonClick.length == 0) {
                        console.log("이유 없음")
                        return
                    }
                    background2.remove()
                    const da = await package.serverAPI("/change", {id: targetId, reason: reasonClick})
                })

                document.body.appendChild(background2)
                background2.appendChild(main2)
                main2.appendChild(inputMain)
                inputMain.appendChild(inputUser)
                inputMain.appendChild(input)
                main2.appendChild(reasonUl)
                main2.appendChild(button)
            })

            document.body.appendChild(background)
            background.appendChild(main)
            main.appendChild(top)

            while(!window.teamerFullList) {
                await new Promise(res => setTimeout(res, 100))
            }

            for(const i of window.teamerFullList) {
                const li = document.createElement("li")
                li.className = "vp-4-li"
                li.style.position = "relative"
                li.style.display = "flex"
                li.style.width = "100%"
                li.style.justifyContent = "flex-start"
                li.style.alignItems = "center"
                li.style.backgroundColor = "rgba(204, 204, 204, 1)"
                li.style.color = "black"
                li.style.border = "5px solid"
                li.style.borderColor = "rgba(171, 171, 171, 1)"
                li.style.borderRadius = "5px"
                li.style.flexDirection = "column"
                li.style.boxSizing = "border-box"

                const containerUp = document.createElement("div")
                containerUp.className = "vp-4-containerUp"
                containerUp.style.position = "relative"
                containerUp.style.display = "flex"
                containerUp.style.width = "100%"
                containerUp.style.justifyContent = "center"
                containerUp.style.alignItems = "center"

                const img = document.createElement("img")
                img.style.height = "50px"
                img.src = i.img

                const label = document.createElement("label")
                label.color = "black"
                label.innerText = `${i.displayName} (@${i.name})`

                containerUp.addEventListener("click", () => {
                    const existing = li.querySelector('.vp-4-containerDown')
                    if (existing) {
                        existing.remove()
                        return
                    }
                    const containerDown = document.createElement("div")
                    containerDown.className = "vp-4-containerDown"
                    containerDown.style.position = "relative"
                    containerDown.style.display = "flex"
                    containerDown.style.width = "100%"
                    containerDown.style.justifyContent = "center"
                    containerDown.style.alignItems = "flex-start"
                    containerDown.style.backgroundColor = "rgba(187, 187, 187, 1)"
                    containerDown.style.color = "black"
                    containerDown.style.padding = "10px"
                    containerDown.style.flexDirection = "column"
                    containerDown.style.gap = "5px"

                    const label1 = document.createElement("label")
                    label1.style.color = "black"
                    label1.innerText = "프로필 설명:"

                    const description = document.createElement("div")
                    description.className = "vp-4-description"
                    description.style.position = "relative"
                    description.style.display = "flex"
                    description.style.width = "100%"
                    description.style.height = "200px"
                    description.style.justifyContent = "flex-start"
                    description.style.alignItems = "flex-start"
                    description.style.backgroundColor = "rgba(215, 215, 215, 1)"
                    description.style.color = "black"
                    description.style.padding = "10px"
                    description.style.overflowY = "auto"
                    description.innerText = i.description
                    if(i.description == "") {
                        description.innerText = "설명 없음"
                    }

                    const label2= document.createElement("label")
                    label2.style.color = "black"
                    label2.innerText = "박제 사유:"

                    const reasonUl = document.createElement("ul")
                    reasonUl.style.position = "relative"
                    reasonUl.style.display = "flex"
                    reasonUl.style.flexWrap = "wrap";
                    reasonUl.style.width = "100%"
                    reasonUl.style.justifyContent = "flex-start"
                    reasonUl.style.alignItems = "center"
                    reasonUl.style.gap = "5px"

                    console.log(i.reason)
                    for(const j of i.reason) {
                        const reasonLi = document.createElement("li")
                        reasonLi.style.position = "relative"
                        reasonLi.style.display = "flex"
                        reasonLi.style.width = "120px"
                        reasonLi.style.height = "50px"
                        reasonLi.style.justifyContent = "center"
                        reasonLi.style.alignItems = "center"
                        reasonLi.style.backgroundColor = "rgba(209, 209, 209, 1)"
                        reasonLi.style.color = "black"
                        reasonLi.style.border = "5px solid"
                        reasonLi.style.borderColor = "rgba(180, 180, 180, 1)"
                        reasonLi.style.borderRadius = "5px"
                        reasonLi.innerText = j
                        reasonUl.appendChild(reasonLi)
                    }

                    li.appendChild(containerDown)
                    containerDown.appendChild(label1)
                    containerDown.appendChild(description)
                    containerDown.appendChild(label2)
                    containerDown.appendChild(reasonUl)
                })
                main.appendChild(li)
                li.appendChild(containerUp)
                containerUp.appendChild(img)
                containerUp.appendChild(label)
            }
        })
        buttonWrapper.appendChild(li3)
        buttonWrapper.appendChild(li4)
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