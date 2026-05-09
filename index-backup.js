require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const session = require("express-session");
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
} = require("discord.js");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_FILE = path.join(__dirname, "blacklist.json");

const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID || "";
const BYPASS_ROLE_ID = process.env.BYPASS_ROLE_ID || "";
const OWNER_USER_ID = process.env.OWNER_USER_ID || "";

const BLOCK_ALL_LINKS = process.env.BLOCK_ALL_LINKS === "true";
const BLOCK_DISCORD_INVITES = process.env.BLOCK_DISCORD_INVITES !== "false";

const BLOCKED_DOMAINS = [
  "discord.gg",
  "discord.com/invite",
  "onlyfans.com",
  "pornhub.com",
  "xvideos.com",
  "xnxx.com",
  "xhamster.com",
  "redtube.com",
  "grabify",
  "bit.ly",
  "tinyurl.com"
];

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "change_this_secret_now",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax"
    }
  })
);

function loadBlacklist() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.words) ? data.words : [];
  } catch {
    return [];
  }
}

function saveBlacklist(words) {
  const cleaned = [
    ...new Set(
      words.map((w) => String(w).trim().toLowerCase()).filter(Boolean)
    )
  ];

  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify({ words: cleaned }, null, 2),
    "utf8"
  );
}

let blacklist = loadBlacklist();

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function replaceLeetspeak(text) {
  return String(text)
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/0/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t")
    .replace(/9/g, "g")
    .replace(/q/g, "g");
}

function normalizeWord(word) {
  return replaceLeetspeak(word).replace(/[^a-z]/g, "");
}

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildWordBypassRegex(word) {
  const normalized = normalizeWord(word);
  if (!normalized) return null;

  const letters = normalized.split("").map(escapeRegex);
  const between = "[^a-z]*";
  const body = letters.join(between);

  return new RegExp(`(^|[^a-z])${body}([^a-z]|$)`, "i");
}

function containsBlacklistedWord(content, words) {
  const preparedContent = replaceLeetspeak(content);

  for (const word of words) {
    const regex = buildWordBypassRegex(word);
    if (!regex) continue;

    if (regex.test(preparedContent)) {
      return word;
    }
  }

  return null;
}

function extractUrls(text) {
  const regex =
    /(https?:\/\/[^\s]+|www\.[^\s]+|discord\.gg\/[^\s]+|discord\.com\/invite\/[^\s]+)/gi;
  return String(text).match(regex) || [];
}

function containsBlockedLink(content) {
  const urls = extractUrls(content);
  if (!urls.length) return null;

  for (const url of urls) {
    const lower = url.toLowerCase();

    if (
      BLOCK_DISCORD_INVITES &&
      (lower.includes("discord.gg/") || lower.includes("discord.com/invite/"))
    ) {
      return { type: "discord_invite", value: url };
    }

    for (const domain of BLOCKED_DOMAINS) {
      if (lower.includes(domain.toLowerCase())) {
        return { type: "blocked_domain", value: url };
      }
    }

    if (BLOCK_ALL_LINKS) {
      return { type: "any_link", value: url };
    }
  }

  return null;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

async function sendLog(text) {
  if (!LOG_CHANNEL_ID) return;

  const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  if (!logChannel || !logChannel.isTextBased()) return;

  await logChannel.send({ content: text }).catch(() => null);
}

client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!message.content) return;

    const me = message.guild.members.me;
    if (!me) return;

    if (!me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return;
    }

    if (BYPASS_ROLE_ID && message.member?.roles?.cache?.has(BYPASS_ROLE_ID)) {
      return;
    }

    const originalContent = message.content;
    const authorTag = message.author.tag;
    const authorId = message.author.id;
    const channelName = message.channel?.name || "unknown-channel";
    const guildName = message.guild.name;

    const blockedLink = containsBlockedLink(originalContent);
    if (blockedLink) {
      await message.delete().catch(() => null);

      await sendLog(
        `🔗 **Blocked link deleted**\n` +
        `**User:** ${authorTag} (${authorId})\n` +
        `**Server:** ${guildName}\n` +
        `**Channel:** #${channelName}\n` +
        `**Type:** ${blockedLink.type}\n` +
        `**Matched link:** ${escapeHtml(blockedLink.value)}\n` +
        `**Message:** ${escapeHtml(originalContent)}`
      );

      console.log(`Blocked link from ${authorTag}: ${blockedLink.value}`);
      return;
    }

    const matchedWord = containsBlacklistedWord(originalContent, blacklist);
    if (!matchedWord) return;

    await message.delete().catch(() => null);

    await sendLog(
      `🛡️ **Blocked word deleted**\n` +
      `**User:** ${authorTag} (${authorId})\n` +
      `**Server:** ${guildName}\n` +
      `**Channel:** #${channelName}\n` +
      `**Matched word:** ${escapeHtml(matchedWord)}\n` +
      `**Message:** ${escapeHtml(originalContent)}`
    );

    console.log(
      `Deleted message from ${authorTag} in ${guildName}. Matched word: ${matchedWord}`
    );
  } catch (error) {
    console.error("Moderation error:", error);
  }
});

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  if (OWNER_USER_ID && req.session.user.id !== OWNER_USER_ID) {
    return res.status(403).send("You are not allowed to manage this dashboard.");
  }

  next();
}

app.get("/login", (req, res) => {
  const state = Math.random().toString(36).slice(2);
  req.session.oauthState = state;

  const params = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    response_type: "code",
    scope: "identify",
    redirect_uri: process.env.REDIRECT_URI,
    state,
    prompt: "consent"
  });

  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

app.get("/callback", async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state || state !== req.session.oauthState) {
    return res.status(400).send("Invalid OAuth state or missing code.");
  }

  try {
    const tokenBody = new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.REDIRECT_URI
    });

    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: tokenBody.toString()
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Token exchange failed:", tokenData);
      return res.status(400).send("Failed to get access token.");
    }

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });

    const userData = await userResponse.json();

    if (!userResponse.ok) {
      console.error("User fetch failed:", userData);
      return res.status(400).send("Failed to get user profile.");
    }

    req.session.user = userData;
    res.redirect("/");
  } catch (error) {
    console.error("OAuth error:", error);
    res.status(500).send("OAuth error.");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

app.get("/", (req, res) => {
  const user = req.session.user;
  const items = blacklist.map((word) => `<li>${escapeHtml(word)}</li>`).join("");
  const isOwner = user && (!OWNER_USER_ID || user.id === OWNER_USER_ID);

  res.send(`
    <html>
      <head>
        <title>Badword Bot Dashboard</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 900px;
            margin: 40px auto;
            padding: 20px;
          }
          input, button {
            padding: 10px;
            font-size: 16px;
          }
          .top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            gap: 16px;
          }
          .box {
            border: 1px solid #ccc;
            border-radius: 12px;
            padding: 20px;
          }
          ul {
            line-height: 1.8;
          }
          a {
            text-decoration: none;
          }
          .small {
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="top">
          <h1>Badword Bot Dashboard</h1>
          <div>
            ${
              user
                ? `<span>Logged in as <b>${escapeHtml(user.username)}</b></span> <a href="/logout">Logout</a>`
                : `<a href="/login">Login with Discord</a>`
            }
          </div>
        </div>

        <div class="box">
          <h2>Blocked Words</h2>
          <p class="small">Users with the bypass role are ignored. Messages are deleted and only sent to the log channel.</p>

          ${
            isOwner
              ? `
                <form method="POST" action="/add">
                  <input name="word" placeholder="Enter blocked word" required />
                  <button type="submit">Add</button>
                </form>

                <form method="POST" action="/remove" style="margin-top: 10px;">
                  <input name="word" placeholder="Remove blocked word" required />
                  <button type="submit">Remove</button>
                </form>
              `
              : user
                ? `<p>You are logged in, but you are not allowed to edit this blacklist.</p>`
                : `<p>Log in to manage blocked words.</p>`
          }

          <ul>${items}</ul>
        </div>
      </body>
    </html>
  `);
});

app.post("/add", requireLogin, (req, res) => {
  const word = String(req.body.word || "").trim().toLowerCase();

  if (word && !blacklist.includes(word)) {
    blacklist.push(word);
    saveBlacklist(blacklist);
  }

  res.redirect("/");
});

app.post("/remove", requireLogin, (req, res) => {
  const word = String(req.body.word || "").trim().toLowerCase();
  blacklist = blacklist.filter((w) => w !== word);
  saveBlacklist(blacklist);
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`Website running on port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);