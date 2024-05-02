// 這裡做判定module
const Command = {};

Command._commandDely = 30 * 1000;

// 常用符號作為指令
Command._symbolCommand = [
    '!', '#', '/', '?'
]

// 標準指令
Command._systemCommand = [
    '增加', 'add', '新增', // 新增指令
    '編輯', 'edit', '修改', // 修改指令
    '刪除', 'del', // 刪除指令
    'help', '幫助', '?', // 說明
    '上傳', 'upload', // 上傳圖片
    '抽', // 抽選<tag>
    '紀錄', 'record',
    '指令',
]

Command._actionList = [
    {type: 'help', keyword: ['?', 'help', '幫助']},
    {type: 'add', keyword: ['add', '增加', '新增']},
    {type: 'edit', keyword: ['edit', '編輯', '修改']},
    {type: 'del', keyword: ['del', '刪除']},
    {type: 'upload', keyword: ['upload', '上傳']},
    {type: 'random', keyword: ['抽']}
]

Command.commandTypeList = {
    help: 'help',
    add: 'add',
    edit: 'edit',
    del: 'del',
    upload: 'upload',
    random: 'random',
    custom: 'custom',
    nope: 'nope',
}

// 確認指令需求
Command._commandTypeCheck = (text) => {
    const isSymCommand = Command._symbolCommand.some((e) => e === text[0]); // 取得第一位判定
    const isSysCommand = Command._systemCommand.some((e) => e === text.substring(1)) // 去掉第一位 必須完全符合
    if (isSymCommand && isSysCommand) {
        const commandText = text.substring(1);
        const commandType = Command._actionList.find((e) => e.keyword.includes(commandText))
        return commandType.type
    } else {
        if (isSymCommand && !isSysCommand) {
            // 通常就是自訂類的
            return Command.commandTypeList.custom;
        } else {
            // 完全沒有不符合內容 回傳
            return Command.commandTypeList.nope;
        }
    }
}

// 文字指令的需求
Command.textHandle = (text) => {
    const type = Command._commandTypeCheck();
    const action = {};
    action.type = type; // 種類
    action.command = ''; // 指令
    action.tag = ''; // 標籤
    action.type = ''; // 種類
    action.msg = ''; // 如果需要回傳訊息
    switch (type) {
        case Command.commandTypeList.help:
            action.msg = `說明：\n`;
            break;
        case Command.commandTypeList.add:
            break;
        case Command.commandTypeList.edit:
            break;
        case Command.commandTypeList.del:
            break;
        case Command.commandTypeList.upload:
            break;
        case Command.commandTypeList.random:
            break;
        case Command.commandTypeList.custom:
            break;
        case Command.commandTypeList.nope:
            break;
    }

    // return (action, command, tag)
}


function testCommand() {
    Command._commandTypeCheck('增加')
}

// 指令要求
// !help
// 新增格式必須為!主指令;
