// 這裡做判定module
const Command = {};

Command._commandDely = 30 * 1000;

// 常用符號作為指令
Command._symbolCommand = [
    '!', '！', '#', '＃', '/', '／',
]
// 分隔符號
Command._spiltSymbol = ','

// 標準指令
Command._systemCommand = [
    '增加', 'add', '新增', // 新增指令
    '編輯', 'edit', '修改', // 修改指令
    '刪除', 'del', // 刪除指令
    'help', '幫助', '?', // 說明
    '上傳', 'upload', // 上傳圖片
    '抽', // 抽選<tag>
    '紀錄', 'record', //
    '筆記', 'memo', '備忘', //備忘
    '指令',
]

Command._actionList = [
    {type: 'help', keyword: ['help', '幫助', '?']},
    {type: 'add', keyword: ['add', '增加', '新增']},
    {type: 'edit', keyword: ['edit', '編輯', '修改']},
    {type: 'del', keyword: ['del', '刪除']},
    {type: 'upload', keyword: ['upload', '上傳']},
    {type: 'random', keyword: ['抽']},
    {type: 'memo', keyword: ['備忘', 'memo',]},
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
}

// 確認指令需求
Command._commandTypeCheck = (text) => {
    const firstCommand = text.split(Command._spiltSymbol)[0];
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
    const action = {};
    action.type = type; // 種類
    action.command = ''; // 指令
    action.tag = ''; // 標籤
    action.msg = ''; // 如果需要回傳訊息
    switch (type) {
        case Command.commandTypeList.HELP:
            break;
        case Command.commandTypeList.ADD:
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
        case Command.commandTypeList.NOPE:
            break;
    }
    return action;
    // return (action, command, tag)
}

function testCommand() {
    Command._commandTypeCheck('增加')
}

// 指令要求
// !help
// 新增格式必須為!主指令;
