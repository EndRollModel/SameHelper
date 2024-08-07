## 鯊鯊小幫手

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

- google drive 中 sheet 做簡易資料庫
- firebase作為簡易圖片的上傳儲存庫

-----

＊注意：以下敘述可能較難一點＊     

建立：     
1. 先準備以下帳號 (google帳號, firebase, line開發者帳號)
2. 依據以下操作流程建立並取得資訊 紀錄該內容

#### Firebase的內容 
1. 建立一個[Firebase](https://console.firebase.google.com/)的帳號與專案
2. 建立專案後請於專案設定 -> 一般設定 -> webAPI金鑰 **紀錄該內容** [^1]()
3. 選擇上方標籤服務帳號 [Firebase Admin SDK]標籤中下方 產生新的私密金鑰 
4. 下載檔案後使用記事本打開內容找到 "**client_email**" 與 "**private_key**"的內容複製起來 [^2 ^3]()
5. 於左側產品類別 -> 建構 -> Storage 按下開始使用 以正式模式建立 建立完成後 上方會有一串網址會是類似[gs://xxxxxxxx.appspot.com]
將gs://去除並且記錄起來 [^4]()

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
5. 將gsTotal的內容貼上至編輯器中的內容儲存發布後將網址貼上至LineBot的webhook上即可
