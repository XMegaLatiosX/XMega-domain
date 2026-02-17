import fs from "fs"

const CLIENT_ID = "egmei63xthzjiyk68lao6nlkjjpuei"
const CLIENT_SECRET = "h3y7xgy88dn64iebh9d4jtx3508oz5"
const USER_LOGIN = "XMegaLatiosX"

async function getAccessToken() {
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
    { method: "POST" }
  )

  const data = await res.json()
  return data.access_token
}

async function updateTwitchStatus() {
  try {
    const token = await getAccessToken()

    const res = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${USER_LOGIN}`,
      {
        headers: {
          "Client-ID": CLIENT_ID,
          "Authorization": `Bearer ${token}`
        }
      }
    )

    const data = await res.json()

    const isLive = data.data.length > 0

    const output = {
      live: isLive,
      viewer_count: isLive ? data.data[0].viewer_count : 0,
      title: isLive ? data.data[0].title : null,
      last_updated: new Date().toISOString()
    }

    fs.writeFileSync(
      "./public/data/twitch.json",
      JSON.stringify(output, null, 2)
    )

    console.log("Updated:", output)
  } catch (err) {
    console.error("Error:", err)
  }
}

// roda imediatamente
updateTwitchStatus()

// roda a cada 60 segundos
setInterval(updateTwitchStatus, 60000)