// module
// 錯誤的內容就寫入到debug的列表
const debugSpeadSheet = SpreadsheetApp.openById(Config.debugSheetId);
const commandSpeadSheet = SpreadsheetApp.openById(Config.commandSheetId);

// 指令表的內容
const commandTabList = ['command', 'temp', 'record', 'analyze'];
const commandTabTitle = [''];
const tempTabTitle = [];
const recordTabTitle = [];
const analyzeTabTitle = [];
// debug的紀錄
const debugTabList = ['debug']
const debugTabTitle = ['date', 'msg'];
