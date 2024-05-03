// controller
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
            Line._joinHandle(event);
            break;
        case 'leave': // 機器人離開群組
            Line._leaveHandle(event);
            break;
        case 'follow': // 追蹤機器人(加入好友)
            Line._followHandle(event);
            break;
        case 'unfollow': // 封鎖機器人(封鎖好友)
            Line._unfollowHandle(event);
            break;
        default:
            break
    }
}

/***************
 * OtherAction *
 ***************/
// 條件過濾

Line._joinHandle = (event) => {
    // 加入群組時時紀錄
    const groupInfo = Line.getGroupInfo(event);
    Sheet.writeRecord(event.type, {id: event.source.groupId, name: groupInfo.groupName});
    Line._replyMsg(event, Line._textStyleBody())
}
Line._leaveHandle = (event) => {
    // 離開群組時紀錄
    Sheet.writeRecord(event.type, {id: event.source.groupId})
}
Line._followHandle = (event) => {
    // 加入好友時紀錄
    const userInfo = Line.getUserInfo(event);
    Sheet.writeDebugLog(JSON.stringify(userInfo), '?')
    Sheet.writeRecord(event.type, {id: event.source.userId, name: userInfo.displayName})
    Line._replyMsg(event, Line._textStyleBody())
}
Line._unfollowHandle = (event) => {
    // 被封鎖時紀錄
    Sheet.writeRecord(event.type, {id: event.source.userId})
}


/***************
 *   處理訊息   *
 ***************/
Line._messageHandle = (event) => {
    switch (event.message.type) {
        case 'text': // 文字
            Line._textMessageHandle(event);
            break;
        case 'image': // 圖片
            Line._imageMessageHandle(event);
            break;
        case 'video': // 影片
            break;
        case 'location': // 地理位置座標
            break;
        case 'sticker': // 貼圖
            break;
    }
}

Line._textMessageHandle = (event) => {
    // 直接判斷邏輯了
    const msgInfo = Command.textHandle(event.message.text);
    switch (msgInfo.type){
        case Command.commandTypeList.HELP:
            break;
        case Command.commandTypeList.ADD:
            break;
        case Command.commandTypeList.MEMO:
            break;
        case Command.commandTypeList.EDIT:
            break;
        case Command.commandTypeList.DEL:
            break;
        case Command.commandTypeList.UPLOAD:
            break;
        case Command.commandTypeList.RANDOM:
            break;
        case Command.commandTypeList.CUSTOM:
            break;
        case Command.commandTypeList.RECORD:
            break;
        case Command.commandTypeList.NOPE:
            return;
    }
    return Line._replyMsg(event, Line._textStyleBody(`傳入的指令為:${msgInfo.type}`))
}

Line._imageMessageHandle = (event) => {
    // 傳送圖片若是符合上傳條件才上傳 所以先搜尋上傳條件temp表 並且要搜尋groupId
    const msgId = event.message.id;
    const imageFile = Line._getImageContent(msgId);
    const uploadUrl = Storage.uploadImage('Test', imageFile);
}


/****************
 *    MsgType   *
 ****************/

/**
 * 文字訊息
 */
Line._textStyleBody = (text) => {
    return {
        type: 'text',
        text: text,
    }
}

/**
 * 圖片訊息
 */
Line._imageStyleBody = (imageUrl) => {
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
 * @param {Object} body
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
