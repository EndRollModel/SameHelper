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
