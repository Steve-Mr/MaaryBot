/**
 * https://github.com/cvzi/telegram-bot-cloudflare
 */

let TOKEN;
let SECRET;

const WEBHOOK = '/endpoint'

const UA = 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0'

/**
 * Wait for requests to the worker
 */
addEventListener('fetch', event => {
  // 从 env 获取环境变量
  TOKEN = event.env.ENV_BOT_TOKEN;
  SECRET = event.env.ENV_BOT_SECRET;
  
  const url = new URL(event.request.url)
  if (url.pathname === WEBHOOK) {
    event.respondWith(handleWebhook(event))
  } else if (url.pathname === '/registerWebhook') {
    event.respondWith(registerWebhook(event, url, WEBHOOK, SECRET))
  } else if (url.pathname === '/unRegisterWebhook') {
    event.respondWith(unRegisterWebhook(event))
  } else {
    event.respondWith(new Response('No handler for this request'))
  }
})

/**
 * Handle requests to WEBHOOK
 * https://core.telegram.org/bots/api#update
 */
async function handleWebhook (event) {
  // Check secret
  if (event.request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== SECRET) {
    return new Response('Unauthorized', { status: 403 })
  }

  // Read request body synchronously
  const update = await event.request.json()
  // Deal with response asynchronously
  event.waitUntil(onUpdate(update))

  return new Response('Ok')
}

/**
 * Handle incoming Update
 * https://core.telegram.org/bots/api#update
 */
async function onUpdate (update) {
  if ('message' in update) {
    await onMessage(update.message)
  }
}

/**
 * Handle incoming Message
 * https://core.telegram.org/bots/api#message
 */
async function onMessage (message) {

  const text = message.text

  const pattern_bv = /(?:https?:\/\/)?(?:www\.)?bilibili\.com\/video\/(BV[^\/?|\s]+)/;
  const pattern_b23 = /(?:https?:\/\/b23\.tv\/[^\s]+)/;
  const pattern_bili2233 = /(?:https?:\/\/bili2233\.cn\/[^\s]+)/;
  const pattern_bparam =  /[?&](t=([0-9.]+))|[?&](p=([0-9]+))/g;

  const pattern_x = /(?:https?:\/\/)?\bx\.com\/(\w+)\/status\/(\w+)/;
  const pattern_insta = /(?:https?:\/\/)?\binstagram\.com\/([^\/]+)\/([^\/?]+)/;
  const pattern_fx = /(?:https?:\/\/)?\bfxtwitter\.com\/(\w+)\/status\/(\w+)/;
  const pattern_fx_alt = /(?:https?:\/\/)?\bfixupx\.com\/(\w+)\/status\/(\w+)/;
  const pattern_vx = /(?:https?:\/\/)?\bvxtwitter\.com\/(\w+)\/status\/(\w+)/;
  const pattern_twi = /(?:https?:\/\/)?\btwitter\.com\/(\w+)\/status\/(\w+)/;

  let timeValue = null;
  let pageValue = null;

  // 检查是否存在 t 和 p 参数
  const paramMatch = text.matchAll(pattern_bparam);
  for (const match of paramMatch) {
    if (match[2]) {
      timeValue = match[2]; // t 参数值
    }
    if (match[4]) {
      pageValue = match[4]; // p 参数值
    }
  }

  if (pattern_bv.test(text)) {
    // bv
    const match = text.match(pattern_bv);
    const bv = match[1]
    const msgBody = await buildMessageBodyFromBV(bv, timeValue, pageValue)
    return sendTextReply(message.chat.id, message.message_id, msgBody)
  } else if (pattern_b23.test(text)) {
    // b23
    const match = text.match(pattern_b23);
    const bvlink = await b23toav(match[0])
    const parts = bvlink.split('/');
    const bv = parts.pop() || parts.pop();
    const msgBody = await buildMessageBodyFromBV(bv, timeValue, pageValue)
    return sendTextReply(message.chat.id, message.message_id, msgBody)
  } else if (pattern_bili2233.test(text)) {
    // b23
    const match = text.match(pattern_bili2233);
    const bvlink = await b23toav(match[0])
    const parts = bvlink.split('/');
    const bv = parts.pop() || parts.pop();
    const msgBody = await buildMessageBodyFromBV(bv, timeValue, pageValue)
    return sendTextReply(message.chat.id, message.message_id, msgBody)
  } else if (pattern_x.test(text)) {
    // x.com
    const match = text.match(pattern_x);
    //const url = text.replace('x.com', 'fxtwitter.com');
    const url = "https://fxtwitter.com/" + match[1] + "/status/" + match[2]
    return sendTextReply(message.chat.id, message.message_id, url)
  } else if (pattern_twi.test(text)) {
    // twitter.com
    const match = text.match(pattern_twi);
    const url = "https://fxtwitter.com/" + match[1] + "/status/" + match[2]
    return sendTextReply(message.chat.id, message.message_id, url)
  }  else if (pattern_fx.test(text)) {
    // x.com
    const match = text.match(pattern_fx);
    //const url = text.replace('x.com', 'fxtwitter.com');
    const url = "https://x.com/" + match[1] + "/status/" + match[2]
    return sendTextReply(message.chat.id, message.message_id, url)
  }  else if (pattern_fx_alt.test(text)) {
    // x.com
    const match = text.match(pattern_fx_alt);
    //const url = text.replace('x.com', 'fxtwitter.com');
    const url = "https://x.com/" + match[1] + "/status/" + match[2]
    return sendTextReply(message.chat.id, message.message_id, url)
  }  else if (pattern_vx.test(text)) {
    // x.com
    const match = text.match(pattern_vx);
    //const url = text.replace('x.com', 'fxtwitter.com');
    const url = "https://x.com/" + match[1] + "/status/" + match[2]
    return sendTextReply(message.chat.id, message.message_id, url)
  } else if (pattern_insta.test(text)) {
    // instagram.com
    const match = text.match(pattern_insta);
    // const url = text.replace('instagram.com', 'ddinstagram.com');
    const url = "https://ddinstagram.com/" + match[1] + "/" + match[2]
    return sendTextReply(message.chat.id, message.message_id, url)
  }

  //return sendPlainText(message.chat.id, 'Echo:\n' + message.text)
  return null
}

async function buildMessageBodyFromBV(bv, timeValue = null, pageValue = null) {
  const base_av = 'https://www.bilibili.com/video/av';
  const title = await getInfoFromBV(bv);
  
  let link = `${base_av}${bv2av(bv)}`;
  
  // 如果存在 t 或 p 参数，将它们附加到链接中
  if (timeValue) {
    link += `?t=${timeValue}`;
  }
  
  if (pageValue) {
    // 如果有 t 参数，p 需要用 & 连接，否则用 ?
    link += timeValue ? `&p=${pageValue}` : `?p=${pageValue}`;
  }

  if (title) {
    return `${title}\n${link}`;
  } else {
    return link;
  }
}


// https://socialsisteryi.github.io/bilibili-API-collect/docs/misc/bvid_desc.html#javascript-typescript
function bv2av(bvid) {
  const XOR_CODE = 23442827791579n;
  const MASK_CODE = 2251799813685247n;
  const BASE = 58n;
  const data = 'FcwAPNKTMug3GV5Lj7EJnHpWsx4tb8haYeviqBz6rkCy12mUSDQX9RdoZf';
  const bvidArr = Array.from(bvid);
  [bvidArr[3], bvidArr[9]] = [bvidArr[9], bvidArr[3]];
  [bvidArr[4], bvidArr[7]] = [bvidArr[7], bvidArr[4]];
  bvidArr.splice(0, 3);
  const tmp = bvidArr.reduce((pre, bvidChar) => pre * BASE + BigInt(data.indexOf(bvidChar)), 0n);
  return Number((tmp & MASK_CODE) ^ XOR_CODE);
}

async function b23toav(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': UA
    },
    redirect: 'manual' // 不要自动重定向
  });
  const trackedUrl = response.headers.get('Location');
  const bvid = trackedUrl.split('?', 1)[0];
  return bvid
}

/**
 * Send plain text message
 * https://core.telegram.org/bots/api#sendmessage
 */
async function sendPlainText (chatId, text) {
  return (await fetch(apiUrl('sendMessage', {
    chat_id: chatId,
    text
  }))).json()
}

/**
 * Reply message
 * https://core.telegram.org/bots/api#sendmessage
 */
async function sendTextReply (chatId, messageId, text) {
  return (await fetch(apiUrl('sendMessage', {
    chat_id: chatId,
    text,
    reply_to_message_id: messageId
  }))).json()
}

async function getInfoFromBV(bv) {
  const API_URL = 'https://api.bilibili.com/x/web-interface/view'
  const apiUrlWithParams = `${API_URL}?bvid=${bv}`

  const response = await fetch(apiUrlWithParams);
  if (!response.ok) {
    return null
  }

  const jsonData = await response.json();

  //const desc = generatePreview(jsonData.data.desc)
  //if (desc) {
  //  return `「${jsonData.data.title}」 - 「${jsonData.data.owner.name}」\n${desc}`
  //} else {
    return `「${jsonData.data.title}」 - 「${jsonData.data.owner.name}」`
  //}
}

function generatePreview(desc) {

  let preview = desc.replaceAll('\n', ' ')

  const maxLength = 100;
  // 如果title字段的长度超过了最大字符数，则截取字符串
  if (preview.length > maxLength) {
    // 使用substring()方法截取字符串
    return preview.substring(0, maxLength).trim() + '……';
  } else {
    return preview.trim()
  }
}

/**
 * Set webhook to this worker's url
 * https://core.telegram.org/bots/api#setwebhook
 */
async function registerWebhook (event, requestUrl, suffix, secret) {
  // https://core.telegram.org/bots/api#setwebhook
  const webhookUrl = `${requestUrl.protocol}//${requestUrl.hostname}${suffix}`
  const r = await (await fetch(apiUrl('setWebhook', { url: webhookUrl, secret_token: secret }))).json()
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}

/**
 * Remove webhook
 * https://core.telegram.org/bots/api#setwebhook
 */
async function unRegisterWebhook (event) {
  const r = await (await fetch(apiUrl('setWebhook', { url: '' }))).json()
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}

/**
 * Return url to telegram api, optionally with parameters added
 */
function apiUrl (methodName, params = null) {
  let query = ''
  if (params) {
    query = '?' + new URLSearchParams(params).toString()
  }
  return `https://api.telegram.org/bot${TOKEN}/${methodName}${query}`
}

