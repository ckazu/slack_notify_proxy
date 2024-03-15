import * as functions from "firebase-functions"
import { WebClient, ChatPostMessageArguments } from "@slack/web-api"

export const notifySlack = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed")
    return
  }

  const { channel, text, attachments, file } = req.body

  if (!channel || (!text && !attachments)) {
    res.status(400).send("Bad Request")
    return
  }

  try {
    const slackToken = functions.config().slack.token
    const web = new WebClient(slackToken)

    const slackPayload: ChatPostMessageArguments = {
      channel: channel,
      text: text,
      attachments: attachments,
    }

    const messageResult = await web.chat.postMessage(slackPayload)

    if (file && messageResult.ok && messageResult.ts) {
      const decodedFile = Buffer.from(file, "base64")
      await web.files.upload({
        channels: channel,
        filename: "attachment.txt",
        file: decodedFile,
        thread_ts: messageResult.ts, // メッセージのスレッドにファイルを添付
      })
    }

    res.status(200).json({ status: "success", message: "Notification sent" })
  } catch (error) {
    console.error("Error sending Slack notification:", JSON.stringify(error))
    res.status(500).json({ status: "error", message: "Internal Server Error" })
  }
})
