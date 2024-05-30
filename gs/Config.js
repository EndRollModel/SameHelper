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

