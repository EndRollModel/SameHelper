// module
const Line = {};


Line.handle = (event) => {
    // events, message
    switch (event.type) {
        case 'message': // message系列
            Line._messageHandle(event);
            break;
        case 'postback': // postback
            break;
        case 'join': // 把機器人加入群組
            break;
        case 'follow': // 追蹤機器人(加入好友)
            break;
        case 'unfollow': // 封鎖機器人(封鎖好友)
            break;
        default:
            break
    }
}

/***************
 *   Action    *
 ***************/
// 條件過濾


/***************
 *   處理訊息   *
 ***************/
Line._messageHandle = (event) => {
    switch (event.message.type) {
        case 'text':
            Line._textMessageHandle(event);
            break;
        case 'image':
            Line._imageMessageHandle(event);
            break;
        case 'video':
            break;
        case 'location':
            break;
        case 'sticker':
            break;

    }
}

Line._textMessageHandle = (event) => {
}

Line._imageMessageHandle = (event) => {
    const msgId = event.message.id;
    const imageFile = Line._getImageContent(msgId);
    const uploadUrl = Storage.uploadImage('Test', imageFile);
    // Line._replyMsg(event, [{
    //     type: 'text',
    //     text: `成功上傳圖片 url:${uploadUrl}`
    // }, {
    //     type: 'image',
    //     originalContentUrl: `${uploadUrl}`,
    //     previewImageUrl: `${uploadUrl}`
    // }])
}


/****************
 * Flex/MsgType *
 ****************/

/**
 * 文字訊息
 */
Line._textStyle = (text) => {
    return {
        type: 'text',
        text: text,
    }
}

/**
 * 圖片訊息
 */
Line._imageStyle = (imageUrl) => {
    return {
        type: 'image',
        originalContentUrl: `${imageUrl}`,
        previewImageUrl: `${imageUrl}`
    }
}


/**************
 *  Line API  *
 **************/

// 取得圖片
Line._getImageContent = (msgId) => {
    const headers = {
        "Authorization": `Bearer ${Config.lineToken}`,
    };
    // 發送 GET 請求以獲取圖片數據，並在請求中包含標頭
    const response = UrlFetchApp.fetch(`https://api-data.line.me/v2/bot/message/${msgId}/content`, {
        headers: headers
    });
    return response.getBlob();
}

/**
 * 回傳訊息
 * @param events
 * @param body
 * @private
 */
Line._replyMsg = function (events, body) {
    // 取出 replayToken 和發送的訊息文字
    const replyToken = events.replyToken;
    if (typeof replyToken === 'undefined') {
        return;
    }
    const url = 'https://api.line.me/v2/bot/message/reply';
    UrlFetchApp.fetch(url, {
        'headers': {
            'Content-Type': 'application/json; charset=UTF-8',
            'Authorization': `Bearer ${Config.lineToken}`
        },
        'method': 'post',
        'payload': JSON.stringify({
            'replyToken': replyToken,
            'messages': Array.isArray(body) ? body : [body],
        }),
    });
}

/**
 * 取得使用者資訊
 * @param events
 * @return {Object} userData
 * userData.pictureUrl
 * userData.displayName
 * @private
 */
Line.getUserInfo = (events) => {
    const userId = events.source.userId
    const response = UrlFetchApp.fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
        "method": "GET",
        "headers": {
            "Authorization": `Bearer ${Config.lineToken}`,
            "Content-Type": "application/json"
        },
    });
    return JSON.parse(response);
}

/**
 * 取得群組的資訊
 * @param events
 * @returns {Object} groupData
 * groupData.groupName
 * groupData.pictureUrl
 * @private
 */
Line.getGroupInfo = (events) => {
    const groupId = events.source.groupId;
    const response = UrlFetchApp.fetch(`https://api.line.me/v2/bot/group/${groupId}/summary`, {
        "method": "GET",
        "headers": {
            "Authorization": `Bearer ${Config.lineToken}`,
            "Content-Type": "application/json"
        },
    });
    return JSON.parse(response);
}
