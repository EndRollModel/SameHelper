function doPost(e) {
    try {
        let msg = JSON.parse(e.postData.contents);
        if (msg.events === undefined) return; // 沒有事件就不用進來了
        const event = msg.events[0];
        Line.handle(event);
    } catch (e) {
        Sheet.writeDebugLog(e.message, e.stack)
    }
}

/*** config ***/
// module
// 引用規則：環境變數都放在Config內調用
// 每個JS都以大寫文件為標題 然後如果是內部調用的function 前面加上底線作為辨識 對外的則包在該大寫名稱的下物件
const Config = {};
// storage
Config.privatKey = PropertiesService.getScriptProperties().getProperty('private_key');
Config.clientEmail = PropertiesService.getScriptProperties().getProperty('client_email');
Config.bucketName = PropertiesService.getScriptProperties().getProperty('bucketName');
Config.projectApiKey = PropertiesService.getScriptProperties().getProperty('projectApiKey');
// sheet
Config.commandSheetId = PropertiesService.getScriptProperties().getProperty('commandSheetId');
Config.debugSheetId = PropertiesService.getScriptProperties().getProperty('debugSheetId');
// line
Config.lineToken = PropertiesService.getScriptProperties().getProperty('lineToken');

/*** command ***/
// 這裡做判定module
const Command = {};

Command._commandDely = 30 * 1000;

// 訊息模板切割字元
Command.splitSpaceSymbol = '\u200B';

// 常用符號作為指令
// (群組中共用指令碼 僅限定群組或個人)(指令查詢時 僅只有群組或個人)
Command._globalCommand = [
    '#', '＃',
]
// 群組個人指令符號
// (群組中個人指令 寫入時必須在群組內)(指令查詢時 必須擁有群組與個人)
Command._groupSymbolCommand = [
    // '/', '／',
]
// 個人跨域全域指令
// (寫入時 僅寫入使用者 無論在哪)(指令查詢時 必須僅查詢個人)
Command._personalSymbolCommand = [
    '~', '～'
]
// 分隔符號
Command._spiltSymbol = [',', '，']

// 防止公式化加上的標誌
Command._trySymbol = "'";

// 文字抽選時用的分隔符號
Command._randomSplitSymbol = [';', '；'];

// 標準指令
Command._systemCommand = [
    '增加', 'add', '新增', // 新增指令
    '編輯', 'edit', '修改', // 修改指令
    '刪除', 'del', // 刪除指令
    'help', '幫助', // 說明
    '上傳', 'upload', // 上傳圖片
    '抽', // 抽選<tag>
    '紀錄', 'record', //
    // '筆記', 'memo', '備忘', //備忘
    '查詢', '指令', '可用',
    '管理', 'board'
]

Command._actionList = [
    {type: 'help', keyword: ['help', '幫助']},
    {type: 'add', keyword: ['add', '增加', '新增']},
    // {type: 'edit', keyword: ['edit', '編輯', '修改']},
    {type: 'del', keyword: ['del', '刪除']},
    {type: 'upload', keyword: ['upload', '上傳']},
    {type: 'random', keyword: ['抽']},
    {type: 'memo', keyword: ['備忘', 'memo']}, // 效果與新增一樣
    {type: 'record', keyword: ['record', '記憶']},
    {type: 'search', keyword: ['查詢', 'search', '指令', '可用']}
]

// 對照用的return type
Command.commandTypeList = {
    HELP: 'help',
    ADD: 'add',
    EDIT: 'edit',
    DEL: 'del',
    UPLOAD: 'upload',
    RANDOM: 'random',
    CUSTOM: 'custom',
    NOPE: 'nope',
    MEMO: 'memo',
    RECORD: 'record',
    ERROR: 'error',
    SEARCH: 'search',
}
Command.permissionTypeList = {
    global: 'global',
    group: 'group',
    persona : 'persona',
}

/**
 * 確認身份權限
 * @private
 */
Command._permissionCheck = (text) => {
    const firstChar = text.trim()[0];
    switch (true){
        case Command._globalCommand.some((e)=> e === firstChar):
            return Command.permissionTypeList.global;
        case Command._groupSymbolCommand.some((e)=> e === firstChar):
            return Command.permissionTypeList.group;
        case Command._personalSymbolCommand.some((e)=> e === firstChar):
            return Command.permissionTypeList.persona;
    }
    return '';
}

/**
 * 列入所有指令的動作事件
 * @param text
 * @return {*|string}
 * @private
 */
Command._commandActionCheck = (text) => {
    const allSymbol = Command._globalCommand.concat(Command._groupSymbolCommand, Command._personalSymbolCommand);
    const commandReg = new RegExp(Command._spiltSymbol.join('|'), 'g');
    const firstCommand = text.split(commandReg)[0].trim();
    const isSymCommand = allSymbol.some((e) => e === firstCommand[0]); // 取得第一位判定
    const isSysCommand = Command._systemCommand.some((e) => e === firstCommand.substring(1).toLowerCase()) // 去掉第一位 必須完全符合
    if (isSymCommand && isSysCommand) {
        const commandText = firstCommand.substring(1);
        const commandType = Command._actionList.find((e) => e.keyword.includes(commandText))
        return commandType.type
    } else {
        if (isSymCommand && !isSysCommand) {
            // 判定是否為抽選 否則為自訂
            const randomCheck = new RegExp(Command._randomSplitSymbol.join('|'), 'g');
            const randomMatch = text.match(randomCheck);
            const keyword = Command._actionList[Command._actionList.findIndex((e) => e.type === Command.commandTypeList.RANDOM)].keyword[0];
            if (randomMatch != null) {
                if (text.startsWith(`${text[0]}${keyword}${randomMatch[0]}`)) {
                    return Command.commandTypeList.RANDOM;
                } else {
                    return Command.commandTypeList.CUSTOM;
                }
            } else {
                return Command.commandTypeList.CUSTOM;
            }
        } else {
            // 完全沒有符合內容
            return Command.commandTypeList.NOPE;
        }
    }
}

/**
 * 新增刪除修改
 * @param text
 */
// 文字指令的需求
Command.textHandle = (text) => {
    // const actionType = Command._commandTypeCheck(text)
    const permissionType = Command._permissionCheck(text);
    const actionType = Command._commandActionCheck(text);
    const commandReg = new RegExp(Command._spiltSymbol.join('|'), 'g');
    const action = {};
    action.type = actionType; // 種類
    action.command = ''; // 指令
    action.commandType = ''; // public | single
    action.info = ''; // 文字的內容
    action.tag = ''; // 標籤
    action.msg = ''; // 如果需要回傳訊息
    action.msgType = ''; // 訊息種類
    action.permission = permissionType; // 訊息權限
    switch (actionType) {
        case Command.commandTypeList.HELP:
            action.type = Command.commandTypeList.HELP;
            const allSymbol = Command._globalCommand.concat(Command._groupSymbolCommand, Command._personalSymbolCommand);
            // 依據群組或是個人拉取指令內容
            action.msg = `本機器人可使用以下符號觸發指令\t\n`
            action.msg += `符號：${Command._globalCommand.join('與')} 作用範圍：群組或是個人共用指令 新增後 若在群組中則所有人都可呼叫該指令\t\n`
            action.msg += `符號：${Command._personalSymbolCommand.join('與')} 作用範圍：個人的專用指令 僅新增的使用者 在任何地方可呼叫\t\n`
            // action.msg = `本機器人可使用以下符號觸發指令\n[${allSymbol.join('與')}]\n`
            action.msg += `指令內容\n\u200B---------\u200B\n`
            action.msg += `新增指令：\n格式：(符號)新增,(指令名稱),(指令內容)\n範例：#新增,yt,youtube(;)com\n說明：呼叫指令時#yt即可讓機器人回傳\n---------\n`;
            action.msg += `上傳指令：\n格式：(符號)上傳,(指令名稱) 或 #上傳,(指令名稱),(tag)\n範例：#上傳,五十嵐,飲料\n說明：呼叫此指令完成後 會要求在一定時間內上傳圖片 指令才會建立\ntag則是供分類使用\n圖片上傳限制：\n3mb以下並且不能為動圖\n---------\n`;
            action.msg += `抽選指令：\n格式：#抽,(tag) 或 #抽;(1,2,3,4,5)\n範例：文字抽選 #抽;(麥當勞,肯德基,頂呱呱,丹丹)\n說明：抽選Tag時可直接抽選圖片的內容 後者可自訂文字內容抽選(使用逗號作為分隔符號即可)\n---------\n`;
            action.msg += `查詢指令：\n格式：(符號)查詢 \n說明：回傳已新增的所有自定義指令\n---------\n`;
            break;
        case Command.commandTypeList.SEARCH:
            break;
        case Command.commandTypeList.ADD:
        case Command.commandTypeList.MEMO: {
            // 新增指令 (純文字)
            // 格式 <action> <command> <info>
            const commands = text.split(commandReg);
            switch (true) {
                case commands.length > 3:
                    action.type = Command.commandTypeList.NOPE;
                    action.msg = `指令中包含過多的分隔符號(${Command._spiltSymbol.join('或')})`
                    break;
                case commands.length === 3: // 新增指令及內容
                    // *新增條件是否為系統用的指令 是的話就拒絕
                    let addCommand = commands[1].trim(); // 指令不可空白
                    let commandInfo = commands[2]; // 內容不限制空白
                    if (Command._systemCommand.includes(addCommand)) {
                        action.type = Command.commandTypeList.NOPE;
                        action.msg = `無法使用指令新增指令!`
                    } else {
                        // 避免開頭為=變成指令(注入)
                        if (addCommand.startsWith('=')) {
                            addCommand = Command._trySymbol + addCommand;
                        }
                        if (commandInfo.startsWith('=')) {
                            commandInfo = Command._trySymbol + commandInfo;
                        }
                        action.command = addCommand;
                        action.info = commandInfo;
                    }
                    break;
                case commands.length === 1:
                    action.type = Command.commandTypeList.NOPE;
                    action.msg = `若要新增指令:\n格式:新增,(指令名稱),(指令內容)`
                    break
                default:
                case commands.length === 2:
                    action.type = Command.commandTypeList.NOPE;
                    action.msg = `指令中缺少必要的內容\n格式:新增,(指令名稱),(指令內容)`
                    break;
            }
            break;
        }
        case Command.commandTypeList.EDIT: {
            break;
        }
        case Command.commandTypeList.DEL: {
            const commands = text.split(commandReg);
            switch (true){ // 格式 <action> <command>
                case commands.length > 2:
                    action.type = Command.commandTypeList.NOPE;
                    action.msg = `指令中包含過多的分隔符號(${Command._spiltSymbol.join('或')})`;
                    break;
                case commands.length === 2:
                    action.command = commands[1].trim();
                    break;
                case commands.length === 1:
                    action.type = Command.commandTypeList.NOPE;
                    action.msg = `指令中缺少必要的內容\n格式:#刪除,(指令名稱)`;
                    break;
                default:
                    break;
            }
            break;
        }
        case Command.commandTypeList.UPLOAD: {
            const commands = text.split(commandReg);
            switch (true) {// 格式 <action> <command> <tag>
                case commands.length > 3:
                    action.type = Command.commandTypeList.NOPE;
                    action.msg = `指令中包含過多的分隔符號(${Command._spiltSymbol.join('或')})`
                    break;
                case commands.length === 3:
                    action.command = commands[1].trim();
                    action.tag = commands[2].trim();
                    break;
                case commands.length === 2:
                    action.command = commands[1].trim();
                    break;
                case commands.length === 1:
                    action.type = Command.commandTypeList.NOPE;
                    action.msg = `若要使用上傳指令:\n格式:#上傳,(指令名稱),(tag(可不填))`
                    break
                default:
                    action.type = Command.commandTypeList.NOPE;
                    action.msg = `指令中缺少必要的內容\n格式:#上傳,(指令名稱),(tag(可不填))`
                    break;
            }
            break;
        }
        case Command.commandTypeList.RANDOM: {
            const randomSym = new RegExp(Command._randomSplitSymbol.join('|'), 'g')
            const checkText = text.match(randomSym);
            if (checkText != null) {
                const randomObject = text.split(randomSym)[1];
                const objs = randomObject.split(commandReg);
                action.type = Command.commandTypeList.NOPE;
                action.msg = objs[Math.floor((Math.random() * objs.length))];
            } else {
                const commands = text.split(commandReg);
                switch (true) {// 格式 <action>,<tag>
                    case commands.length > 2:
                        action.type = Command.commandTypeList.NOPE;
                        action.msg = `指令中包含過多的分隔符號(${Command._spiltSymbol.join('或')})`
                        break;
                    case commands.length === 2:
                        action.tag = commands[1].trim();
                        break;
                    case commands.length === 1:
                        action.type = Command.commandTypeList.NOPE;
                        action.msg = `若要使用抽取指令:\n格式:\n抽圖片： #抽,(tag名稱)\n抽文字： #抽;(多個文字項目) \nex: #抽;麥當勞,頂呱呱,肯德基`
                        break
                    default:
                        action.type = Command.commandTypeList.NOPE;
                        action.msg = `指令中缺少必要的內容\n格式:抽圖片： #抽,(tag名稱)\n抽文字： #抽;(多個文字項目) \nex: #抽;麥當勞,頂呱呱,肯德基`
                        break;
                }
            }
            break;
        }
        case Command.commandTypeList.CUSTOM: {
            const commands = text.split(commandReg);
            switch (true) {// 格式 <action>
                case commands.length === 1:
                    const allSymbol = Command._globalCommand.concat(Command._groupSymbolCommand, Command._personalSymbolCommand)
                    const reg = new RegExp(allSymbol.join('|'));
                    action.command = commands[0].startsWith('=') ? Command._trySymbol + commands[0].replace(reg, '').trim() : commands[0].replace(reg, '').trim();
                    break;
                default : // 自訂並且大於數量
                    action.type = Command.commandTypeList.NOPE
                    break
            }
            break;
        }
        case Command.commandTypeList.NOPE: {
            // nothing..
            break;
        }
    }
    return action;
}

/*** Line **/

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
    Sheet.writeRecord(event.type, {id: event.source.groupId});
}
Line._followHandle = (event) => {
    // 加入好友時紀錄
    const userInfo = Line.getUserInfo(event);
    Sheet.writeRecord(event.type, {id: event.source.userId, name: userInfo.displayName});
    // Line._replyMsg(event, Line._textStyleBody())
}
Line._unfollowHandle = (event) => {
    // 被封鎖時紀錄
    Sheet.writeRecord(event.type, {id: event.source.userId});
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

/**
 * 文字訊息處理
 * @param event
 */
Line._textMessageHandle = (event) => {
    // 直接判斷邏輯了
    const msgInfo = Command.textHandle(event.message.text);
    let userId = event.source.userId;
    let groupId = event.source.type === 'group' ? event.source.groupId : '';
    switch (msgInfo.type) {
        case Command.commandTypeList.HELP: // 說明
            break;
        case Command.commandTypeList.SEARCH:
            msgInfo.msg = Line._searchAction(userId, groupId, msgInfo.permission);
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
                msgInfo.msg = `目前已經重複的指令 [${msgInfo.command}]，等待上傳中`;
            } else {
                // 沒有指令 建立
                msgInfo.msg = Sheet.appendTemp(msgInfo.command, msgInfo.tag, Date.now(), userId, groupId, msgInfo.permission);
            }
            break;
        }
        case Command.commandTypeList.DEL: // 刪除
            const checkExist = Sheet.searchCommand(msgInfo.command, '', userId, groupId, msgInfo.permission);
            if (Object.hasOwn(checkExist, 'info')) {
                msgInfo.msg = Sheet.editCommandClose(msgInfo.command, checkExist.type, checkExist.tag, checkExist.info, checkExist.index, checkExist.userId, checkExist.groupId, checkExist.permission);
            } else {
                msgInfo.msg = `沒有此指令可供刪除`;
            }
            break;
        case Command.commandTypeList.RANDOM: // 抽
            if (msgInfo.tag !== '') { // 空值會成立
                const getTagData = Sheet.searchTagData(msgInfo.tag, userId, groupId, msgInfo.permission);
                if (getTagData.length > 0) {
                    msgInfo.msgType = 'image';
                    msgInfo.msg = getTagData[Math.floor(getTagData.length * Math.random())].info;
                } else {
                    msgInfo.msg = '沒有該Tag的資料!';
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
                msgInfo.msg = `沒有此指令!`;
            }
            break;
        case Command.commandTypeList.RECORD: // 紀錄 目前先不寫功能
            break;
        case Command.commandTypeList.NOPE: // 如果msg內有東西 則回傳msg
            break;
    }
    if (msgInfo.msg !== '') {
        if (msgInfo.msgType === 'image') {
            return Line._replyMsg(event, Line._imageStyleBody(msgInfo.msg));
        } else {
            return Line._replyMsg(event, Line._textStyleBody(msgInfo.msg));
        }
    }
}

/**
 * 圖片訊息處理
 * @param event
 */
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


/**
 * 查詢訊息的回覆
 * @param userId
 * @param groupId
 * @param permission
 */
Line._searchAction = (userId, groupId, permission) => {
    let returnMsg = ''
    let commandMsg = '';
    const searchCommands = Sheet.searchCanUseCommand(userId, groupId, permission);
    // const searchCommands = Sheet.searchCommand(userId, groupId, permission);
    if (searchCommands.length > 0) {
        searchCommands.forEach((e, i) => {
            commandMsg += (e.tag !== '') ? `名稱：${e.command}\t Tag: ${e.tag}\n` : `名稱：${e.command}\n`;
        });
        switch (permission) {
            case Command.permissionTypeList.global:
                returnMsg = groupId !== '' ? `此群組共用指令為：\n${commandMsg}` : `此一對一對話可用共通指令為：\n${commandMsg}`;
                break;
            case Command.permissionTypeList.group:
                returnMsg = groupId !== '' ? `此群組該使用者可用指令為：\n${commandMsg}` : `非群組指令不使用！`;
                break;
            case Command.permissionTypeList.persona:
                returnMsg = groupId !== '' ? `個人指令請一對一查詢！` : `使用者的個人指令為：\n${commandMsg}`;
                break;
        }
        // returnMsg = groupId === '' ? `此群組可用自訂指令為：\n` : '使用者已建立的指令為：\n'
        // searchCommands.forEach((e, i) => {
        //     if (e.tag !== '') {
        //         returnMsg += `名稱：${e.command}\t Tag: ${e.tag}`;
        //     } else {
        //         returnMsg += `名稱：${e.command}`;
        //     }
        //     if (i !== searchCommands.length - 1) {
        //         returnMsg += '\n'
        //     }
        // })
    } else {
        returnMsg = groupId === '' ? `您還未建立任何可用指令` : `此群組尚未建立任何可用指令`
    }
    return returnMsg;
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
    // if (eventType === 'join') {
    //     // 群組
    // } else {
    //     // 個人使用者
    // }
    return {
        type: 'text',
        text: '歡迎使用本機器人，請使用#help了解更多使用方法'
    }
}

/**
 * 用Flex去做旋轉木馬的卡片
 */
Line.helpFlexEventBody = (...commands) => {

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
 * @param {boolean} quote
 * @description
 * 回傳訊息用 但如果有QuoteToken則回傳該對象對話內容
 */
Line._replyMsg = function (events, body, quote = true) {
    // 取出 replayToken 和發送的訊息文字
    const replyToken = events.replyToken;
    const checkQuote = Object.hasOwn(events.message, 'quoteToken');
    if (typeof replyToken === 'undefined') {
        return;
    }
    const url = 'https://api.line.me/v2/bot/message/reply';
    if (checkQuote) {
        // 僅text type回傳才用回覆 不然圖片會死
        if (Array.isArray(body)) {
            if (body[0].type === 'text') {
                body[0].quoteToken = events.message.quoteToken;
            }
        } else {
            if (body.type === 'text'){
                body.quoteToken = events.message.quoteToken;
            }
        }
    }
    const payload = {};
    payload.replyToken = replyToken;
    payload.messages = Array.isArray(body) ? body : [body];
    UrlFetchApp.fetch(url, {
        'headers': {
            'Content-Type': 'application/json; charset=UTF-8',
            'Authorization': `Bearer ${Config.lineToken}`
        },
        'method': 'post',
        'payload': JSON.stringify(payload),
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

/*** Sheet ***/

const Sheet = {}

// module
// 錯誤的內容就寫入到debug的列表
// getRange(row, column, numRows, numColumns)
Sheet.debugSpreadSheet = SpreadsheetApp.openById(Config.debugSheetId);
Sheet.commandSpreadSheet = SpreadsheetApp.openById(Config.commandSheetId);

// 寫入指令的時間
Sheet._tempDelayTime = 30 * 1000;

// 指令表的內容
Sheet._commandTabList = [
    {
        name: 'command',
        title: ['command', 'type', 'tag', 'info', 'userId', 'groupId', 'permission', 'history', 'status']
    }, //
    {name: 'temp', title: ['command', 'tag', 'date', 'userId', 'groupId', 'permission', 'status']}, //
    {name: 'recordKey', title: ['keyword', 'userId', 'groupId', 'status']},
    {name: 'chatRecord', title: ['chat', 'date', 'userId', 'groupId']},
    {name: 'users', title: ['userId', 'userName', 'status']},
    {name: 'groups', title: ['groupId', 'groupName', 'status']},
];
Sheet._debugTabList = [
    {name: 'debug', title: ['date', 'msg', 'stack']}
];
// 做key值呼叫而已 為了避免直接打字串打錯
Sheet.Dictionary = {
    COMMAND: 'command',
    FOLLOW: 'follow',
    UNFOLLOW: 'unfollow',
    JOIN: 'join',
    LEAVE: 'leave',
    USERS: 'users',
    GROUPS: 'groups',
    USERID: 'userId',
    GROUPID: 'groupId',
    HISTORY: 'history',
    STATUS: 'status',
    TEMP: 'temp',
    TYPE: 'type',
    INFO: 'info',
    DATE: 'date',
    TAG: 'tag',
    PERMISSION: 'permission',
}

Sheet.COMMAND_TYPE = {
    TEXT: 'text',
    IMAGE: 'image',
}

/**************
 *   handler  *
 **************/
Sheet.writeRecord = (type, info) => {
    // join, leave, follow, unfollow
    // info {id, name}
    switch (type) {
        case 'join':
            Sheet._eventRecord(Sheet.Dictionary.GROUPS, type, Sheet.Dictionary.GROUPID, info.id, info.name)
            break;
        case 'leave':
            Sheet._eventRecord(Sheet.Dictionary.GROUPS, type, Sheet.Dictionary.GROUPID, info.id)
            break;
        case 'follow':
            Sheet._eventRecord(Sheet.Dictionary.USERS, type, Sheet.Dictionary.USERID, info.id, info.name)
            break;
        case 'unfollow':
            Sheet._eventRecord(Sheet.Dictionary.USERS, type, Sheet.Dictionary.USERID, info.id)
            break;
    }
}

/**
 * 搜尋表中key的值
 * @param tabName tab的名稱
 * @param action action type (join, leave, follow, unfollow)
 * @param key title的標籤
 * @param value 要搜尋的值
 * @param name 如果是新增會需要傳入name
 * @private
 * @description *注意* 此方法必須輸入正確的key, 否則會錯誤
 */
Sheet._eventRecord = (tabName, action, key, value, name = '') => {
    // const tabIndex = Sheet.getALLSheetName(Sheet.commandSpeadSheet).findIndex((e) => e === tabName);
    const tabPage = Sheet.getSheetTab(Sheet.commandSpreadSheet, tabName);
    const searchValue = Sheet._searchKeyValues(tabPage, key)
    if (searchValue.includes(value)) {
        // 若有就先檢查狀態 然後更換狀態
        const rowIndex = searchValue.findIndex((e) => e === value) + 2;
        // const statusIndex = titleList.findIndex((e) => e === 'status') + 1;
        const tabIndex = Sheet._commandTabList.findIndex((tab) => tab.name === tabName);
        const statusIndex = Sheet._commandTabList[tabIndex].title.findIndex((e) => e === Sheet.Dictionary.STATUS) + 1
        switch (tabName) {
            case 'users':
                tabPage.getRange(rowIndex, statusIndex, 1, 1).setValue(action === Sheet.Dictionary.FOLLOW ? Sheet.Dictionary.FOLLOW : Sheet.Dictionary.UNFOLLOW);
                break;
            case 'groups':
                tabPage.getRange(rowIndex, statusIndex, 1, 1).setValue(action === Sheet.Dictionary.JOIN ? Sheet.Dictionary.JOIN : Sheet.Dictionary.LEAVE);
                break;
        }
    } else {
        // 若沒有就新增
        switch (tabName) {
            case 'users':
                tabPage.appendRow([value, name, action === Sheet.Dictionary.FOLLOW ? Sheet.Dictionary.FOLLOW : Sheet.Dictionary.UNFOLLOW])
                break;
            case 'groups':
                tabPage.appendRow([value, name, action === Sheet.Dictionary.JOIN ? Sheet.Dictionary.JOIN : Sheet.Dictionary.LEAVE])
                break;
        }
    }
}

/**
 * 取得頁面中的所有資料
 * @param pageName
 * @return {*[]}
 */
Sheet.searchALLData = (pageName) => {
    const tabPage = Sheet.getSheetTab(Sheet.commandSpreadSheet, pageName);
    const allData = tabPage.getRange(1, 1, tabPage.getLastRow(), tabPage.getLastColumn()).getDisplayValues();
    const allDataList = [];
    allData.forEach((data, i) => {
        if (i === 0) {
            return;
        }
        const obj = {}
        obj.index = i;
        data.forEach((info, j) => {
            obj[allData[0][j]] = info
        })
        allDataList.push(obj);
    })
    return allDataList
}

/**************
 *    Temp    *
 *************/
// 時間超過或是狀態關閉都不予搜尋
Sheet.searchTemp = (command, date, userId, groupId, permission) => {
    // 檢查時間
    const tabPage = Sheet.getSheetTab(Sheet.commandSpreadSheet, Sheet.Dictionary.TEMP);
    const allData = tabPage.getRange(1, 1, tabPage.getLastRow(), tabPage.getLastColumn()).getDisplayValues();
    const newData = allData.map((target, index) => ({target, index}));
    const titleList = newData[0].target;
    const filter = newData.filter((e) => {
        const commandIndex = titleList.findIndex((e) => e === Sheet.Dictionary.COMMAND)
        const permissionIndex = titleList.findIndex((e) => e === Sheet.Dictionary.PERMISSION);
        const dateIndex = titleList.findIndex((e) => e === Sheet.Dictionary.DATE);
        const userIndex = titleList.findIndex((e) => e === Sheet.Dictionary.USERID)
        const groupIndex = titleList.findIndex((e) => e === Sheet.Dictionary.GROUPID);
        const statusIndex = titleList.findIndex((e) => e === Sheet.Dictionary.STATUS);
        if (command === '') {
            // 圖片上傳的時候要檢查這裡 確認上傳者與群組一致 並且時間小於時限
            // return parseFloat(e.target[dateIndex]) > date && e.target[userIndex] === userId && e.target[groupIndex] === groupId
            return parseFloat(e.target[dateIndex]) > date && e.target[userIndex] === userId && e.target[groupIndex] === groupId
        } else {
            switch (permission) {
                case Command.permissionTypeList.global:
                    if (groupId === '') {
                        return e.target[commandIndex] === command &&
                            e.target[permissionIndex] === permissionIndex &&
                            parseFloat(e.target[dateIndex]) > date &&
                            e.target[userIndex] === userId &&
                            e.target[groupIndex] === '' &&
                            e.target[statusIndex].toLowerCase() === true.toString();
                    } else {
                        return e.target[commandIndex] === command &&
                            e.target[permissionIndex] === permissionIndex &&
                            parseFloat(e.target[dateIndex]) > date &&
                            e.target[groupIndex] === groupId &&
                            e.target[statusIndex].toLowerCase() === true.toString();
                    }
                case Command.permissionTypeList.group:
                    return e.target[commandIndex] === command &&
                        e.target[permissionIndex] === permissionIndex &&
                        parseFloat(e.target[dateIndex]) > date &&
                        e.target[groupIndex] === groupId &&
                        e.target[userIndex] === userId &&
                        e.target[statusIndex].toLowerCase() === true.toString();

                case Command.permissionTypeList.persona:
                    return e.target[commandIndex] === command &&
                        e.target[permissionIndex] === permissionIndex &&
                        parseFloat(e.target[dateIndex]) > date &&
                        e.target[userIndex] === userId &&
                        e.target[statusIndex].toLowerCase() === true.toString();
            }
            // 一般檢查用的 一定會有指令
            // if (groupId !== '') {
            //     // 如果是群組上傳的 主要檢查群組的內容
            //     return e.target[commandIndex] === command &&
            //         parseFloat(e.target[dateIndex]) > date &&
            //         e.target[groupIndex] === groupId
            // } else {
            //     // 如果為使用者上傳的 僅檢查上傳者
            //     return e.target[commandIndex] === command &&
            //         parseFloat(e.target[dateIndex]) > date &&
            //         e.target[userIndex] === userId
            // }
        }
    });
    if (filter.length > 0) {
        const returnData = {};
        filter[0].target.forEach((e, i) => {
            returnData[titleList[i]] = e
        })
        returnData.index = filter[0].index;
        return returnData;
    } else {
        return {};
    }
}

/**
 * 寫入暫存
 * @param command
 * @param tag
 * @param date
 * @param userId
 * @param groupId
 * @param permission
 * @return {`請於${number}秒內上傳圖片 指令才會建立。`}
 */
Sheet.appendTemp = (command, tag, date, userId, groupId, permission) => {
    // 根據
    // command tag date userId	groupId	status
    const tabPage = Sheet.getSheetTab(Sheet.commandSpreadSheet, Sheet.Dictionary.TEMP);
    tabPage.appendRow([command.toString(), tag.toString(), date + Sheet._tempDelayTime, userId, groupId, permission, true.toString()])
    return `接收到上傳指令 請於${Sheet._tempDelayTime / 1000}秒內上傳圖片。`
}

/**
 * 更替狀態
 * @param index
 */
Sheet.editTempStatus = (index) => {
    const tabPage = Sheet.getSheetTab(Sheet.commandSpreadSheet, Sheet.Dictionary.TEMP);
    const dateNameIndex = Sheet._commandTabList.findIndex((tab) => tab.name === Sheet.Dictionary.TEMP);
    const tabNameList = Sheet._commandTabList[dateNameIndex].title
    const dateColIndex = tabNameList.findIndex((e) => e === Sheet.Dictionary.DATE);
    tabPage.getRange(index + 1, dateColIndex + 1, 1, 1).setValue(-1);
}

/***************
 *   command   *
 **************/

/**
 * 搜尋是否已經有該指令
 * @param command 指令名稱
 * @param type 指令的類型(text, image)
 * @param userId 使用者id
 * @param groupId 群組id
 * @param permission 權限
 */
Sheet.searchCommand = (command, type = '', userId, groupId, permission) => {
    const tabPage = Sheet.getSheetTab(Sheet.commandSpreadSheet, Sheet.Dictionary.COMMAND);
    const allData = tabPage.getRange(1, 1, tabPage.getLastRow(), tabPage.getLastColumn()).getDisplayValues();
    const newData = allData.map((target, index) => ({target, index}));
    const titleList = newData[0].target;
    const filter = newData.filter((elem) => {
        const commandIndex = titleList.findIndex((e) => e === Sheet.Dictionary.COMMAND);
        const permissionIndex = titleList.findIndex((e) => e === Sheet.Dictionary.PERMISSION)
        const typeIndex = titleList.findIndex((e) => e === Sheet.Dictionary.TYPE);
        const userIndex = titleList.findIndex((e) => e === Sheet.Dictionary.USERID);
        const groupIndex = titleList.findIndex((e) => e === Sheet.Dictionary.GROUPID);
        const statusIndex = titleList.findIndex((e) => e === Sheet.Dictionary.STATUS);
        switch (permission) {
            case Command.permissionTypeList.global: // 群組通用指令
                if (groupId === '') {
                    // 如果對象為單一使用者 則僅限於該人的指令
                    return elem.target[commandIndex] === command &&
                        elem.target[permissionIndex] === permission &&
                        elem.target[userIndex] === userId &&
                        elem.target[groupIndex] === '' &&
                        elem.target[statusIndex].toLowerCase() === true.toString();
                } else {
                    // 如對象有群組 則為群組的共用指令
                    return elem.target[commandIndex] === command &&
                        elem.target[permissionIndex] === permission &&
                        elem.target[groupIndex] === groupId &&
                        elem.target[statusIndex].toLowerCase() === true.toString();
                }
            case Command.permissionTypeList.group:
                // 群組中個人指令 全部都一樣才回傳
                return elem.target[commandIndex] === command &&
                    elem.target[permissionIndex] === permission &&
                    elem.target[groupIndex] === groupId &&
                    elem.target[userIndex] === userId &&
                    elem.target[statusIndex].toLowerCase() === true.toString();
            case Command.permissionTypeList.persona:
                // 個人專用個人指令 不管他在哪裡新增 對象只會有權限跟使用者相同 即使有groupId的值
                return elem.target[commandIndex] === command &&
                    elem.target[permissionIndex] === permission &&
                    elem.target[userIndex] === userId &&
                    elem.target[statusIndex].toLowerCase() === true.toString();
        }
        // if (type === '' || type === null) {
        //     // type為空時 為custom指令 僅搜尋來源指令與上傳者
        //     if (groupId !== '') {
        //         return (elem.target[commandIndex] === command &&
        //             elem.target[groupIndex] === groupId)
        //     } else {
        //         return (elem.target[commandIndex] === command &&
        //             elem.target[userIndex] === userId)
        //     }
        // } else {
        //     // 新增指令時需要查詢是否有對應的種類內容
        //     if (groupId !== '') {
        //         return (elem.target[commandIndex] === command &&
        //             elem.target[groupIndex] === groupId)
        //     } else {
        //         return (elem.target[commandIndex] === command &&
        //             elem.target[userIndex] === userId)
        //     }
        // }
    });
    if (filter.length > 0) {
        const returnData = {}
        filter[0].target.forEach((e, i) => {
            returnData[titleList[i]] = e
        })
        returnData.permission = permission;
        returnData.index = filter[0].index;
        return returnData;
    } else {
        return {}
    }
}

/**
 * 查詢對象可用指令
 * @param userId
 * @param groupId
 * @param permission
 * @return {*[]}
 */
Sheet.searchCanUseCommand = (userId, groupId, permission) => {
    const tabPage = Sheet.getSheetTab(Sheet.commandSpreadSheet, Sheet.Dictionary.COMMAND);
    const allData = tabPage.getRange(1, 1, tabPage.getLastRow(), tabPage.getLastColumn()).getDisplayValues();
    const newData = allData.map((target, index) => ({target, index}));
    const titleList = newData[0].target;
    const filter = newData.filter((elem) => {
        const userIndex = titleList.findIndex((e) => e === Sheet.Dictionary.USERID);
        const groupIndex = titleList.findIndex((e) => e === Sheet.Dictionary.GROUPID);
        const permissionIndex = titleList.findIndex((e) => e === Sheet.Dictionary.PERMISSION);
        const statusIndex = titleList.findIndex((e) => e === Sheet.Dictionary.STATUS);
        // 新增指令時需要查詢是否有對應的種類內容
        switch (permission) {
            case Command.permissionTypeList.global:
                if (groupId !== '') {
                    return elem.target[groupIndex] === groupId &&
                        elem.target[permissionIndex] === permission &&
                        elem.target[statusIndex].toLowerCase() === true.toString();
                    // return elem.target[groupIndex] === groupId
                } else {
                    return elem.target[userIndex] === userId &&
                        elem.target[permissionIndex] === permission &&
                        elem.target[statusIndex].toLowerCase() === true.toString()
                    // return elem.target[userIndex] === userId
                }
            case Command.permissionTypeList.group:
                return elem.target[userIndex] === userId &&
                    elem.target[groupIndex] === groupId &&
                    elem.target[permissionIndex] === permission &&
                    elem.target[statusIndex].toLowerCase() === true.toString();
            // break;
            case Command.permissionTypeList.persona :
                return elem.target[userIndex] === userId &&
                    elem.target[permissionIndex] === permission &&
                    elem.target[statusIndex].toLowerCase() === true.toString();
            // break;
        }
    });
    if (filter.length > 0) {
        const returnData = []
        // {target : [], index : }
        filter.forEach((commandInfo) => {
            const returnObject = {}
            commandInfo.target.forEach((e, i) => {
                if (titleList[i] === Sheet.Dictionary.COMMAND ||
                    titleList[i] === Sheet.Dictionary.TYPE ||
                    titleList[i] === Sheet.Dictionary.TAG) {
                    returnObject[titleList[i]] = e
                }
            })
            returnData.push(returnObject)
        });
        return returnData;
    } else {
        return []
    }
}

/**
 * 抽選tag的所有內容
 * @param tag
 * @param userId
 * @param groupId
 * @param permission
 * @return {{}}
 */
Sheet.searchTagData = (tag, userId, groupId, permission) => {
    const tabPage = Sheet.getSheetTab(Sheet.commandSpreadSheet, Sheet.Dictionary.COMMAND);
    const allData = tabPage.getRange(1, 1, tabPage.getLastRow(), tabPage.getLastColumn()).getDisplayValues();
    const newData = allData.map((target, index) => ({target, index}));
    const titleList = newData[0].target;
    const filter = newData.filter((elem) => {
        const tagIndex = titleList.findIndex((e) => e === Sheet.Dictionary.TAG);
        const userIndex = titleList.findIndex((e) => e === Sheet.Dictionary.USERID);
        const groupIndex = titleList.findIndex((e) => e === Sheet.Dictionary.GROUPID);
        const statusIndex = titleList.findIndex((e) => e === Sheet.Dictionary.STATUS);
        const permissionIndex = titleList.findIndex((e) => e === Sheet.Dictionary.PERMISSION);
        // 搜尋時需要搜尋對象
        switch (permission) {
            case Command.permissionTypeList.global:
                if (groupId !== '') {
                    return (elem.target[tagIndex] === tag &&
                        elem.target[groupIndex] === groupId &&
                        elem.target[permissionIndex] === permission &&
                        elem.target[statusIndex].toLowerCase() === true.toString())
                } else {
                    return (elem.target[tagIndex] === tag &&
                        elem.target[userIndex] === userId &&
                        elem.target[groupIndex] === '' &&
                        elem.target[permissionIndex] === permission &&
                        elem.target[statusIndex].toLowerCase() === true.toString())
                }
            case Command.permissionTypeList.group:
                return (elem.target[tagIndex] === tag &&
                    elem.target[groupIndex] === groupId &&
                    elem.target[permissionIndex] === permission &&
                    elem.target[statusIndex].toLowerCase() === true.toString())
            case Command.permissionTypeList.persona:
                return (elem.target[tagIndex] === tag &&
                    elem.target[userIndex] === userId &&
                    elem.target[permissionIndex] === permission &&
                    elem.target[statusIndex].toLowerCase() === true.toString())
        }

    });
    if (filter.length > 0) {
        const returnData = []
        // {target : [], index : }
        filter.forEach((fer) => {
            const returnObject = {}
            fer.target.forEach((e, i) => {
                returnObject[titleList[i]] = e
            })
            returnData.push(returnObject)
        });
        return returnData;
    } else {
        return []
    }
}

/**
 * 新增新的指令
 * @param command 指令名稱
 * @param type 類別(text, image)
 * @param tag 如果有tag
 * @param info 指令的內容
 * @param userId 使用者id
 * @param groupId 群組id
 * @param permission 權限
 * @return {String}
 */
Sheet.appendCommand = (command, type, tag, info, userId, groupId, permission) => {
    // ['command', 'type', 'tag', 'info', 'userId', 'groupId', 'history', 'status']
    const tabPage = Sheet.getSheetTab(Sheet.commandSpreadSheet, Sheet.Dictionary.COMMAND);
    // if (groupId !== '') {
    //     tabPage.appendRow([command.toString(), type, tag.toString(), info.toString(), '', groupId, permission, '', true.toString()]);
    // } else {
    tabPage.appendRow([command.toString(), type, tag.toString(), info.toString(), userId, groupId, permission, '', true.toString()]);
    // }
    const checkFormula = `${Command._trySymbol}=`
    return `新增指令：[${command.startsWith(checkFormula) ? command.replace("'", '') : command}] 完成`
}

/**
 * 修改指令
 * @param command 指令名稱
 * @param type 種類
 * @param tag tag:如果有的畫
 * @param info 內容
 * @param index 第幾個index
 * @param userId userId
 * @param groupId groupId
 * @param permission 權限
 * @return {String}
 */
Sheet.editCommand = (command, type, tag, info, index, userId, groupId, permission) => {
    const tabPage = Sheet.getSheetTab(Sheet.commandSpreadSheet, Sheet.Dictionary.COMMAND);
    // if (groupId !== '') {
    //     tabPage.getRange(index + 1, 1, 1, tabPage.getLastColumn()).setValues([[command.toString(), type, tag.toString(), info.toString(), '', groupId, '', true.toString()]])
    // } else {
    tabPage.getRange(index + 1, 1, 1, tabPage.getLastColumn()).setValues([[command.toString(), type, tag.toString(), info.toString(), userId, groupId, permission, '', true.toString()]])
    // }
    const checkFormula = `${Command._trySymbol}=`
    return `修改指令：[${command.startsWith(checkFormula) ? command.replace("'", '') : command}] 完成`;
}


/**
 * 刪除指令
 * @param command 指令名稱
 * @param type 種類
 * @param tag tag:如果有的畫
 * @param info 內容
 * @param index 第幾個index
 * @param userId userId
 * @param groupId groupId
 * @param permission 權限
 * @return {String}
 */
Sheet.editCommandClose = (command, type, tag, info, index, userId, groupId, permission) => {
    const tabPage = Sheet.getSheetTab(Sheet.commandSpreadSheet, Sheet.Dictionary.COMMAND);
    // if (groupId !== '') {
    //     tabPage.getRange(index + 1, 1, 1, tabPage.getLastColumn()).setValues([[command.toString(), type, tag.toString(), info.toString(), '', groupId, '', true.toString()]])
    // } else {
    tabPage.getRange(index + 1, 1, 1, tabPage.getLastColumn()).setValues([[command.toString(), type, tag.toString(), info.toString(), userId, groupId, permission, '', false.toString()]])
    // }
    const checkFormula = `${Command._trySymbol}=`
    return `刪除指令：[${command.startsWith(checkFormula) ? command.replace("'", '') : command}] 完成`;
}


/***************
 *  debug相關  *
 ***************/

/**
 * 取得某張表內的key下的所有值
 * @param tabPage
 * @param key
 * @returns {FlatArray<*, 1>[]}
 * @private
 */
Sheet._searchKeyValues = (tabPage, key) => {
    const titleList = tabPage.getRange(1, 1, 1, tabPage.getLastColumn()).getDisplayValues()[0]; // 取得標題
    const titleListIndex = titleList.findIndex((e) => e === key) + 1;
    return tabPage.getRange(2, titleListIndex, (tabPage.getLastRow() - 1 === 0) ? 1 : tabPage.getLastRow(), 1).getDisplayValues().flat();
}

/**
 * 取得所有表的名稱
 * @param sheet
 * @returns {*}
 */
Sheet.getALLSheetName = function (sheet) {
    return sheet.getSheets().map((e) => e.getName());
}

/**
 * 取得該表
 * @param sheet
 * @param tabName
 * @returns {*}
 */
Sheet.getSheetTab = function (sheet, tabName) {
    const nameList = sheet.getSheets().map((e) => e.getName());
    const tabNameIndex = nameList.findIndex((e) => e === tabName)
    return sheet.getSheets()[tabNameIndex]
}

/**
 * debug紀錄
 * @param msg
 * @param stack
 */
Sheet.writeDebugLog = (msg, stack) => {
    const now = new Date();
    const formattedDateTime = Utilities.formatDate(now, "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
    Sheet.debugSpreadSheet.appendRow([formattedDateTime, msg, stack])
}

/**
 * 根據名單建立tab與title
 * @private
 */
Sheet._checkAllSheetTab = () => {
    Sheet._commandTabList.forEach((tab) => {
        const commandSheets = Sheet.commandSpreadSheet.getSheets();
        const isExist = commandSheets.some((sheet) => sheet.getName() === tab.name);
        if (!isExist) {
            const newTab = Sheet.commandSpreadSheet.insertSheet();
            newTab.setName(tab.name);
            const allName = Sheet.getALLSheetName(Sheet.commandSpreadSheet);
            const tabIndex = allName.findIndex((name) => name === tab.name);
            Sheet.commandSpreadSheet.getSheets()[tabIndex].getRange(1, 1, 1, tab.title.length).setValues([tab.title]);
            Sheet.commandSpreadSheet.getSheets()[tabIndex].getRange(1, 1, 1, tab.title.length).setHorizontalAlignment("center");
            Sheet.commandSpreadSheet.getSheets()[tabIndex].getRange(1, 1, 1, tab.title.length).setFontWeight("bold");
            // sheet.setColumnWidth(columnIndex, columnWidth);
            Sheet.commandSpreadSheet.getSheets()[tabIndex].getRange(2, 1, Sheet.commandSpreadSheet.getSheets()[tabIndex].getMaxRows(), Sheet.commandSpreadSheet.getSheets()[tabIndex].getMaxColumns()).setNumberFormat("@");
            Sheet.commandSpreadSheet.getSheets()[tabIndex].getRange(2, 1, Sheet.commandSpreadSheet.getSheets()[tabIndex].getMaxRows(), Sheet.commandSpreadSheet.getSheets()[tabIndex].getMaxColumns()).setHorizontalAlignment("center");
            if (tab.name === Sheet.Dictionary.USERS || tab.name === Sheet.Dictionary.GROUPS) {
                Sheet.commandSpreadSheet.getSheets()[tabIndex].setColumnWidth(1, 260)
            }
        }
    })
}


/**************/

function checkAllSheet() {
    Sheet._checkAllSheetTab()
}

/**************/

/*** Storage ***/

const Storage = {}
// 流程是 先取得專案apiKey, 然後將裡面資訊做成jwt後
// 再走fierbase的auth去產生匿名使用者 之後再取用該匿名使用者去上傳圖片
/**
 * 建立jwt的機制
 * 認證的樣式 依照官方文件建立
 * https://firebase.google.com/docs/auth/admin/create-custom-tokens?hl=zh-tw
 */
Storage._getUserToken = () => {
    const header = {
        alg: 'RS256',
        typ: 'JWT',
    };
    const now = Date.now();
    const expires = new Date(now);
    expires.setHours(expires.getHours() + 1); // 一小時過期
    const payload = {
        iss: Config.clientEmail,
        sub: Config.clientEmail,
        aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
        iat: Math.round(now / 1000),
        exp: Math.round(expires.getTime() / 1000),
        uid: 'SameDesu',
        // claims:{} // 這裡可以自訂安全規則或是custom keys
    };

    let toSign = Utilities.base64Encode(JSON.stringify(header)) + '.' + Utilities.base64Encode(JSON.stringify(payload));
    // toSign = toSign.replace(/=+$/, ''); // 不用刪除此內容
    let key = Config.privatKey.replace(/\\n/g, '\n');
    const signatureBytes = Utilities.computeRsaSha256Signature(toSign, key);
    const signature = Utilities.base64Encode(signatureBytes);
    const jwtToken = toSign + '.' + signature;
    // Logger.log(jwtToken)
    //取得使用者的token
    const baseUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${Config.projectApiKey}`
    const requestBody = {
        "token": jwtToken,
        "returnSecureToken": true
    };
    const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(requestBody),
    };
    const response = UrlFetchApp.fetch(baseUrl, options);

    // 處理回應
    const responseData = JSON.parse(response.getContentText());
    return responseData.idToken;
}

/**
 * 上傳圖片的function
 */
Storage.uploadImage = (fileName, image) => {
    const uploadUserToken = Storage._getUserToken();
    try {
        const baseUrl = `https://firebasestorage.googleapis.com/v0/b/${Config.bucketName}/o/${fileName}`
        const options = {
            method: 'post',
            headers: {
                'Authorization': `Bearer ${uploadUserToken}`,
                'Content-Type': 'application/octet-stream',
            },
            payload: image,
        };
        const response = UrlFetchApp.fetch(baseUrl, options);
        const responseData = JSON.parse(response.getContentText());
        if (!Object.hasOwn(responseData, 'bucket')) {
            return '';
        } else {
            return `https://firebasestorage.googleapis.com/v0/b/${responseData.bucket}/o/${encodeURIComponent(responseData.name)}?alt=media&token=${responseData.downloadTokens}`
        }
    } catch (e) {
        return JSON.stringify({ type: e.message, data: uploadUserToken, path: `https://firebasestorage.googleapis.com/v0/b/${Config.bucketName}/o/${fileName}` });
    }
}




