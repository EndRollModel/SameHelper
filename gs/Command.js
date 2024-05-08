// 這裡做判定module
const Command = {};

Command._commandDely = 30 * 1000;

// 常用符號作為指令
Command._symbolCommand = [
    '!', '！', '#', '＃', '/', '／',
]
// 分隔符號
Command._spiltSymbol = [',', '，']

// 防止公式化加上的標誌
Command._trySymbol = "'";

// 標準指令
Command._systemCommand = [
    '增加', 'add', '新增', // 新增指令
    '編輯', 'edit', '修改', // 修改指令
    '刪除', 'del', // 刪除指令
    'help', '幫助', '?', // 說明
    '上傳', 'upload', // 上傳圖片
    '抽', // 抽選<tag>
    '紀錄', 'record', //
    // '筆記', 'memo', '備忘', //備忘
    '指令',
]

Command._actionList = [
    {type: 'help', keyword: ['help', '幫助', '?']},
    {type: 'add', keyword: ['add', '增加', '新增']},
    // {type: 'edit', keyword: ['edit', '編輯', '修改']},
    {type: 'del', keyword: ['del', '刪除']},
    {type: 'upload', keyword: ['upload', '上傳']},
    {type: 'random', keyword: ['抽']},
    {type: 'memo', keyword: ['備忘', 'memo',]}, // 效果與新增一樣
    {type: 'record', keyword: ['record', '記憶']},
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
}

// 確認指令需求
Command._commandTypeCheck = (text) => {
    const commandReg = new RegExp(Command._spiltSymbol.join('|'), 'g');
    const firstCommand = text.split(commandReg)[0].trim();
    const isSymCommand = Command._symbolCommand.some((e) => e === firstCommand[0]); // 取得第一位判定
    const isSysCommand = Command._systemCommand.some((e) => e === firstCommand.substring(1)) // 去掉第一位 必須完全符合
    if (isSymCommand && isSysCommand) {
        const commandText = firstCommand.substring(1);
        const commandType = Command._actionList.find((e) => e.keyword.includes(commandText))
        return commandType.type
    } else {
        if (isSymCommand && !isSysCommand) {
            // 通常就是自訂類的
            return Command.commandTypeList.CUSTOM;
        } else {
            // 完全沒有符合內容 回傳
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
    const type = Command._commandTypeCheck(text);
    const commandReg = new RegExp(Command._spiltSymbol.join('|'), 'g');
    const action = {};
    action.type = type; // 種類
    action.command = ''; // 指令
    action.info = ''; // 文字的內容
    action.tag = ''; // 標籤
    action.msg = ''; // 如果需要回傳訊息
    action.msgType = ''; // 訊息種類
    switch (type) {
        case Command.commandTypeList.HELP:
            action.type = Command.commandTypeList.HELP;
            // 依據群組或是個人拉取指令內容
            action.msg = `目前可使用指令\n#新增, #上傳`
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
                        if(addCommand.startsWith('=')){
                            addCommand = Command._trySymbol + addCommand;
                        }
                        if(commandInfo.startsWith('=')){
                            commandInfo = Command._trySymbol + commandInfo;
                        }
                        action.command = addCommand;
                        action.info = commands[2];
                    }
                    break;
                case commands.length === 1:
                    action.type = Command.commandTypeList.NOPE;
                    action.msg = `若要新增指令:\n格式:#新增,(指令名稱),(指令內容)`
                    break
                default:
                case commands.length === 2:
                    action.type = Command.commandTypeList.NOPE;
                    action.msg = `指令中缺少必要的內容\n格式:#新增,(指令名稱),(指令內容)`
                    break;
            }
            break;
        }
        case Command.commandTypeList.EDIT: {break;}
        case Command.commandTypeList.DEL: {
            const commands = text.split(commandReg);
            // switch (true){ // 格式 <action> <command>
            //     case commands.length > 2:
            //         action.type = Command.commandTypeList.NOPE;
            //         action.msg = `指令中包含過多的分隔符號(${Command._spiltSymbol.join('或')})`;
            //         break;
            //     case commands.length === 2:
            //         action.info = commands[1].trim();
            //         break;
            //     case commands.length === 1:
            //         action.type = Command.commandTypeList.NOPE;
            //         action.msg = `指令中缺少必要的內容\n格式:#刪除,(指令名稱)`;
            //         break;
            //     default:
            //         break;
            // }
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
                    action.msg = `若要使用上傳指令:\n格式:#上傳,(指令名稱),(tag(可不填))\n替換指令時也使用同樣內容即可`
                    break
                default:
                    action.type = Command.commandTypeList.NOPE;
                    action.msg = `指令中缺少必要的內容\n格式:#上傳,(指令名稱),(tag(可不填))`
                    break;
            }
            break;
        }
        case Command.commandTypeList.RANDOM: {
            const commands = text.split(commandReg);
            switch (true) {// 格式 <action>,<tag>
                case commands.length > 2:
                    action.type = Command.commandTypeList.NOPE;
                    action.msg = `指令中包含過多的分隔符號(${Command._spiltSymbol.join('或')})`
                    break;
                case commands.length === 2:
                    action.command = commands[1].trim();
                    action.tag = commands[2].trim();
                    break;
                case commands.length === 1:
                    action.type = Command.commandTypeList.NOPE;
                    action.msg = `若要使用上傳指令:\n格式:#抽,(指令名稱),(tag(可不填))\n替換指令時也使用同樣內容即可`
                    break
                default:
                    action.type = Command.commandTypeList.NOPE;
                    action.msg = `指令中缺少必要的內容\n格式:#抽,(指令名稱),(tag(可不填))`
                    break;
            }
            break;
        }
        case Command.commandTypeList.CUSTOM: {
            const commands = text.split(commandReg);
            switch (true) {// 格式 <action>
                // case commands.length > 1:
                //     action.type = Command.commandTypeList.NOPE;
                //     action.msg = `指令中包含過多的分隔符號(${Command._spiltSymbol.join('或')})`
                //     break;
                case commands.length === 1:
                    const reg = new RegExp(Command._symbolCommand.join('|'))
                    action.command = commands[0].replace(reg, '').trim();
                    break;
                default : // 自訂並且大於數量
                    action.type = Command.commandTypeList.NOPE
                    break
            }
            break;
        }
        case Command.commandTypeList.NOPE: {
            break;
        }
    }
    return action;
}
