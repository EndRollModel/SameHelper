const Tools = {}

Tools.calculateSHA256 = (input) => {
    // 計算 SHA-256 哈希值
    let rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input);

    // 將字節數組轉換為十六進制字符串
    return rawHash.map(function (byte) {
        let hex = (byte < 0 ? byte + 256 : byte).toString(16); // 處理負數的情況
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
    // let hexString = rawHash
    //     .map(function(byte) {
    //         // Convert from 2's compliment
    //         var v = (byte < 0) ? 256 + byte : byte;
    //
    //         // Convert byte to hexadecimal
    //         return ("0" + v.toString(16)).slice(-2);
    //     })
    //     .join("");
    return hexString
}


// e270aeb347f2165574c3a5c5bf11d038bcd3acd5abfdb5ae8a1b52d91cb842f0
// 807269743d6e1a0425c0cc987ec3eac6538146ae8bb18c9b946a5ada813a5f7f
