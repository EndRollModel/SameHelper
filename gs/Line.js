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
    let userId = event.source.userId;
    let groupId = event.source.type === 'group' ? event.source.groupId : '';
    switch (msgInfo.type) {
        case Command.commandTypeList.HELP: // 說明
            break;
        case Command.commandTypeList.SEARCH:
            const searchCommands = Sheet.searchCanUseCommand(userId, groupId, msgInfo.permission);
            if (searchCommands.length > 0) {
                msgInfo.msg = groupId === '' ? `此群組可用自訂指令為：\n` : '使用者已建立的指令為：\n'
                searchCommands.forEach((e, i) => {
                    if (e.tag !== '') {
                        msgInfo.msg += `名稱：${e.command}\t Tag: ${e.tag}`;
                    } else {
                        msgInfo.msg += `名稱：${e.command}`;
                    }
                    if (i !== searchCommands.length - 1) {
                        msgInfo.msg += '\n'
                    }
                })
            } else {
                msgInfo.msg = groupId === '' ? `使用者還未建立任何可用指令` : `此群組尚未建立任何可用指令`
            }
            break;
        case Command.commandTypeList.ADD:
        case Command.commandTypeList.MEMO: {// 合併但其實不使用
            // 先搜尋是否有該使用者跟該群組id的指令 並且是否一樣有該指令
            const checkRepeat = Sheet.searchCommand(msgInfo.command, Sheet.COMMAND_TYPE.TEXT, userId, groupId, msgInfo.permission);
            if (Object.hasOwn(checkRepeat, 'info')) {
                // 重複了 覆蓋指令
                msgInfo.msg = Sheet.editCommand(msgInfo.command, Sheet.COMMAND_TYPE.TEXT, msgInfo.tag, msgInfo.info, checkRepeat.index, userId, groupId, msgInfo.permission);
            } else {
                // 沒有重複 新增指令
                msgInfo.msg = Sheet.appendCommand(msgInfo.command, Sheet.COMMAND_TYPE.TEXT, msgInfo.tag, msgInfo.info, userId, groupId, msgInfo.permission);
            }
            break;
        }
        case Command.commandTypeList.UPLOAD: { // 上傳圖片
            // Sheet.searchTemp(); 查詢是否
            const checkRepeat = Sheet.searchTemp(msgInfo.command, Date.now(), userId, groupId, msgInfo.permission);
            if (Object.hasOwn(checkRepeat, 'command')) {
                // 如果重複了
                msgInfo.msg = `目前已經重複的指令 [${msgInfo.command}]，等待上傳中`
            } else {
                // 沒有指令 建立
                msgInfo.msg = Sheet.appendTemp(msgInfo.command, msgInfo.tag, Date.now(), userId, groupId, msgInfo.permission);
            }
            break;
        }
        case Command.commandTypeList.EDIT: // 編輯(棄用)
            break;
        case Command.commandTypeList.DEL: // 刪除
            break;
        case Command.commandTypeList.RANDOM: // 抽
            if (msgInfo.tag !== '') { // 空值會成立
                const getTagData = Sheet.searchTagData(msgInfo.tag, userId, groupId);
                if (getTagData.length > 0) {
                    msgInfo.msgType = 'image'
                    msgInfo.msg = getTagData[Math.floor(getTagData.length * Math.random())].info;
                } else {
                    msgInfo.msg = '沒有該Tag的資料!'
                }
            }
            break;
        case Command.commandTypeList.CUSTOM: // 自訂 呼叫時使用
            const commandList = Sheet.searchCommand(msgInfo.command, null, userId, groupId, msgInfo.permission);
            if (Object.hasOwn(commandList, 'info')) {
                if (commandList.info.indexOf(`${Sheet._trySymbol}=`) > -1) {
                    commandList.info[0].shift()
                }
                msgInfo.msg = commandList.info;
                msgInfo.msgType = commandList.type;
            } else {
                msgInfo.msg = `沒有此指令!`
            }
            break;
        case Command.commandTypeList.RECORD: // 紀錄 目前先不寫功能
            break;
        case Command.commandTypeList.NOPE: // 如果msg內有東西 則回傳msg
            break;
    }
    if (msgInfo.msg !== '') {
        if (msgInfo.msgType === 'image') {
            return Line._replyMsg(event, Line._imageStyleBody(msgInfo.msg))
        } else {
            return Line._replyMsg(event, Line._textStyleBody(msgInfo.msg));
        }
    }
}

Line._imageMessageHandle = (event) => {
    const msgInfo = {}
    // 傳送圖片若是符合上傳條件才上傳 所以先搜尋上傳條件temp表 並且要搜尋groupId
    // 先搜尋temp中的內容 因為只有圖片 不會知道指令內容是什麼
    const checkTemp = Sheet.searchTemp('', Date.now(), event.source.userId, event.source.type === 'group' ? event.source.groupId : '');
    if (!Object.hasOwn(checkTemp, 'command')) return;
    const userId = event.source.userId;
    const groupId = event.source.type === 'group' ? event.source.groupId : '';
    // 有指令 搜尋圖片id 上傳圖片
    const msgId = event.message.id;
    const imageFile = Line._getImageContent(msgId);
    const imageName = event.source.type === 'group' ? `${event.source.groupId}_${checkTemp.command}` : `${userId}_${checkTemp.command}`;
    const uploadUrl = Storage.uploadImage(imageName, imageFile);
    const checkCommand = Sheet.searchCommand(checkTemp.command, null, userId, groupId, checkTemp.permission);
    if (Object.hasOwn(checkCommand, 'info')) {
        // 重複了 覆蓋指令
        msgInfo.msg = Sheet.editCommand(checkTemp.command, Sheet.COMMAND_TYPE.IMAGE, checkTemp.tag, uploadUrl, checkCommand.index, userId, groupId, checkTemp.permission);
    } else {
        // 沒有重複 新增指令
        msgInfo.msg = Sheet.appendCommand(checkTemp.command, Sheet.COMMAND_TYPE.IMAGE, checkTemp.tag, uploadUrl, userId, groupId, checkTemp.permission);
    }
    Sheet.editTempStatus(checkTemp.index)
    if (msgInfo.msg !== '') {
        return Line._replyMsg(event, Line._textStyleBody(msgInfo.msg))
    }
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
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl,
    }
}

/**
 *  join與follow事件的處理
 */
Line.followEventFlexBody = (eventType) => {
    if (eventType === 'join') {
        // 群組
    } else {
        // 個人使用者
    }
    return{
        type: 'text',
        text: '歡迎使用本機器人，請使用/help了解更多使用方法'
    }
}

/**
 * 用Flex去做旋轉木馬的卡片
 */
Line.helpFlexEventBody = (...commands) =>{

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
