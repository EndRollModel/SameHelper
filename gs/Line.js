// controller
const Line = {};

Line.handle = (event) => {
    // events, message
    switch (event.type) {
        case 'message': // message系列
            Line._messageHandle(event);
            break;
        case 'postback': // postback 可能用不到 先接著
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
    // Line._replyMsg(event, Line._textStyleBody())
}
Line._leaveHandle = (event) => {
    // 離開群組時紀錄
    Sheet.writeRecord(event.type, {id: event.source.groupId})
}
Line._followHandle = (event) => {
    // 加入好友時紀錄
    const userInfo = Line.getUserInfo(event);
    Sheet.writeRecord(event.type, {id: event.source.userId, name: userInfo.displayName})
    // Line._replyMsg(event, Line._textStyleBody())
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
    switch (msgInfo.type) {
        case Command.commandTypeList.HELP: // 說明
            break;
        case Command.commandTypeList.ADD:
        case Command.commandTypeList.MEMO: // 合併但其實不使用
            // 先搜尋是否有該使用者跟該群組id的指令 並且是否一樣有該指令
            const checkRepeat = Sheet.searchCommand(msgInfo.command, Sheet.COMMAND_TYPE.TEXT, event.source.userId, event.source.type === 'group' ? event.source.groupId : '');
            if (Object.hasOwn(checkRepeat, 'info')) {
                // 重複了 覆蓋指令
                msgInfo.msg = Sheet.editCommand(msgInfo.command, Sheet.COMMAND_TYPE.TEXT, msgInfo.tag, msgInfo.info, checkRepeat.index, event.source.userId, event.source.type === 'group'? event.source.groupId : '');
            } else {
                // 沒有重複 新增指令
                msgInfo.msg = Sheet.appendCommand(msgInfo.command, Sheet.COMMAND_TYPE.TEXT, msgInfo.tag, msgInfo.info, event.source.userId, event.source.type === 'group' ? event.source.groupId : '');
            }
            break;
        case Command.commandTypeList.UPLOAD: // 上傳圖片
            // Sheet.searchTemp(); 查詢是否
            // const checkRepeat = Sheet.searchCommand(msgInfo.command, Sheet.COMMAND_TYPE.IMAGE, event.source.userId, event.source.type === 'group' ? event.source.groupId : '');
            break;
        case Command.commandTypeList.EDIT: // 編輯(棄用)
            break;
        case Command.commandTypeList.DEL: // 刪除
            break;
        case Command.commandTypeList.RANDOM: // 抽
            break;
        case Command.commandTypeList.CUSTOM: // 自訂 呼叫時使用
            const commandList = Sheet.searchCommand(msgInfo.command, null, event.source.userId, event.source.type === 'group' ? event.source.groupId : '');
            if (Object.hasOwn(commandList, 'info')) {
                msgInfo.msg = commandList.info;
            }else {
                msgInfo.msg = `沒有此指令!`
            }
            break;
        case Command.commandTypeList.RECORD: // 紀錄 目前先不寫功能
            break;
        case Command.commandTypeList.NOPE: // 如果msg內有東西 則回傳msg
            return;
    }
    if(msgInfo.msg !== ''){
        return Line._replyMsg(event, Line._textStyleBody(msgInfo.msg));
    }
    // return Line._replyMsg(event, Line._textStyleBody(`傳入的指令為:${msgInfo.type}`))
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
