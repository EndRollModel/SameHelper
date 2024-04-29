// module
// 錯誤的內容就寫入到debug的列表
const debugSpeadSheet = SpreadsheetApp.openById(Config.debugSheetId);
const commandSpeadSheet = SpreadsheetApp.openById(Config.commandSheetId);

// 指令表的內容
const commandTabList = ['command', 'temp', 'record'];
const commandTabTitle = ['command', 'type', 'userId', 'groupId', 'status'];
const tempTabTitle = ['command', 'userId', 'groupId', 'status'];
const recordTabTitle = ['keyword', 'date', 'userId', 'groupId'];
const analyzeTabTitle = ['']; // 預計新增 但是尚未開始使用ˇ
// debug的紀錄
const debugTabList = ['debug']
const debugTabTitle = ['date', 'msg'];



/***************
 *  debug相關  *
 ***************/

function checkDebugSheet(){
    const nowList = debugSpeadSheet.getSheet().map( (e, i)=> ({name: e.name, index: i}));
    debugSpeadSheet.getSheet().for((e)=>{

    })
}
/**
 * debug紀錄
 * @param msg
 */
function writeDebugLog (msg) {
    // de
}
