const Command = {};

// 常用符號作為指令
Command._symbolCommand = [
    '!', '@', '#',
]

// 標準指令
Command._systemCommand = [
    '增加', 'add', '新增', '編輯', 'edit', '刪除', 'del', '上傳', 'upload',
]

Command.textHandle = () =>{

}

Command._commandCheck = (text) => {
    const isSymCommand = Command._symbolCommand.some((e)=> e === text[0]);
    if(!isSymCommand) return;
    // const commandText
    // const isSysCommand = Command._systemCommand.some((e)=> e == );

}


function testCommmand(){
    Command._commandCheck('增加')
}

