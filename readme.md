## 鯊鯊小幫手

使用google app script 與 firebase 製作 的 自建指令型Line bot

取名來源：   
![](https://github.com/EndRollModel/SameHelper/blob/main/image/same.jpeg =250x)

原本想使用某kea的鯊魚梗圖(隨便啦那張)作為取名靈感來源

最後使用了微軟的AI幫我繪製了一個Line的大頭

說明：

鑑於自己想要試著寫看看類似指令機器人相關的內容

且2024/08後Line要將Keep功能移除

所以就寫了這個可自行建立指令的機器人 並且可以上傳圖片

用作類似Keep的替代品使用

-----

功能：

- 可自行建立指令
- 可上傳圖片
- 支援不同的使用者呼叫情境

-----

運作原理：

- google 雲端Excel 做簡易資料庫 紀錄指令與內容
- firebase 作為簡易圖片的資料庫

-----

###### ＊注意：以下敘述可能較難一點＊     

### 建立步驟：     
1. 先準備以下帳號 (google帳號, firebase, line開發者帳號)
2. 依據以下操作流程建立並取得資訊 紀錄該內容

#### Firebase的內容 
1. 建立一個[Firebase](https://console.firebase.google.com/)的帳號與專案
2. 建立專案後請於專案設定 -> 一般設定 -> webAPI金鑰 **紀錄該內容** [^1]()
3. 選擇上方標籤服務帳號 [Firebase Admin SDK]標籤中下方 產生新的私密金鑰 
4. 下載檔案後使用記事本打開內容找到 "**client_email**" 與 "**private_key**"的內容複製起來 [^2 ^3]()
5. 於左側產品類別 -> 建構 -> Storage 按下開始使用 以正式模式建立 建立完成後 上方會有一串網址會是類似[gs://xxxxxxxx.appspot.com]
將gs://去除並且記錄起來 [^4]()
6. 安全性規則請將此內容貼上並修改 此內容規定上傳必須是圖片並且小於3mb 若需要調整大小僅需要修改3為你想要的mb數
```
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
    	allow write: if request.auth != null
      			  && request.resource.size < 3 * 1024 * 1024
                  && request.resource.contentType.matches('image/.*');
      allow read: if request.auth != null;
    }
  }
}
```

#### Line開發者的內容
1. 建立一個[Line開發者](https://developers.line.biz/console/)帳號與專案建立機器人(Messaging API)
2. 建立後於Messaging API標籤最下方找到Channel access token 按下issue 建立Token並紀錄 [^5]()

#### Google雲端的內容
1. 開啟Google雲端硬碟(drive)
2. 於Google雲端建立兩個Excel(一個紀錄資料,一個紀錄錯誤(可不建立))與一個Google app script
3. 打開Excel表紀錄上方的Id ```https://docs.google.com/spreadsheets/d/"這裡是ID"/edit?gid=0#gid=0``` 紀錄兩張表的ID [^6 ^7]()
3. 打開Google app script的檔案後選擇左邊齒輪的專案設定 下方的指令碼屬性
4. 新增以下的內容 依照以上標記的內容填入
   - 屬性 「projectApiKey」值「^1」
   - 屬性 「client_email」值「^2」
   - 屬性 「private_key」值「^3」
   - 屬性 「bucketName」值「^4」
   - 屬性 「lineToken」值「^5」
   - 屬性 「commandSheetId」值「^6」
   - 屬性 「debugSheetId」值「^7」
5. 將gsTotal的內容貼上至編輯器中的內容按下部署 選擇網路應用程式 (執行身份選擇自己 所有人可存取）發布後將產生的網址複製起來 
6. 至Line開發者後台對應的機器人專案(Message API)中找到webhook的欄位 講上步驟提到的網址貼上後 即可測試機器人功能

---
### 指令
使用不同的前綴可以使用不同的指令    

使用`#`作為開頭的指令呼叫時 : 
   - 使用情境： 為該群組或與機器人的視窗單獨指令 
   - 建立地點： 於群組或是機器人的視窗時建立
   - 使用： 僅能在建立的地點呼叫 且 該群組內的任何人皆可使用該指令

使用`~`作為開頭的指令呼叫時 : 
   -  使用情境： 為使用者個人的指令
   -  建立地點： 任何地方 只要機器人存在的聊天視窗即可
   -  使用： 任何地點可用 且 僅呼叫的使用者才能使用該指令

指令說明：

- 新增/編輯指令：
  - 指令：`增加`, `add`, `新增`
  - 參數：`<指令名稱>,<回傳內容>`
  - 說明：增加指令的方法, 若已存在的指令則會被覆蓋內容
  - 範例：`#新增,自我介紹,我是鯊鯊`
  - 範例：呼叫：`#自我介紹` 回傳：`我是鯊鯊`


- 刪除指令：
   - 指令：`刪除`, `del`
   - 參數：`<指令名稱>`
   - 說明：刪除指令的方法
   - 範例：`#刪除,自我介紹`
   - 回傳：`刪除完成`


- 上傳指令
   - 指令：`上傳`, `upload`
   - 參數：`<指令名稱>`,`<tag>`
   - 說明：呼叫此指令後會回傳訊息 請在訊息回傳後才上傳圖片就會紀錄該內容 tag可不打
   - 範例：`#上傳,午餐`
   - 回傳：`接收到上傳指令 請於30秒內上傳圖片。`


- 抽獎指令
   - 指令：`抽`
   - 說明：依據不同的指令可以進行抽選的動作
   - 範例：分為以下兩種模式
      - 模式1 : 多個文字項目抽選 指令後使用分號 `#抽;麥當勞,肯德基,必勝客`
      - 模式2 : 如果已經有上傳圖片並且有上傳tag `#抽,午餐`

     
- 查詢指令
  - 指令：`查詢`, `指令`, `可用`
  - 說明：查詢可用的指令 若為`~`開頭的指令 因有隱私問題則請對機器人單獨查詢
  - 範例：`#查詢`
