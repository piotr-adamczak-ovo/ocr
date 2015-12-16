  var fs = require('fs');


  function Rect(value) {

    var json = JSON.parse(value);
    console.log(json.y);
    this.x = parseInt(json.x);
    this.y = parseInt(json.y);
    this.width = parseInt(json.width);
    this.height= parseInt(json.height);
  }
/**
 * Sync file copying
 */
 function copyFileSync(srcFile, destFile) {
    var BUF_LENGTH, buff, bytesRead, fdr, fdw, pos;
    BUF_LENGTH = 64 * 1024;
    buff = new Buffer(BUF_LENGTH);
    fdr = fs.openSync(srcFile, 'r');
    fdw = fs.openSync(destFile, 'w');
    bytesRead = 1;
    pos = 0;
    while (bytesRead > 0) {
        bytesRead = fs.readSync(fdr, buff, 0, BUF_LENGTH, pos);
        fs.writeSync(fdw, buff, 0, bytesRead);
        pos += bytesRead;
    }
    fs.closeSync(fdr);
    return fs.closeSync(fdw);
};


function datetimestamp() {
    var today = new Date();
    var sToday = today.getDate().toString();
    sToday += '-';
    sToday += (today.getMonth()+1).toString();
    sToday += '-';
    sToday += today.getFullYear().toString();
    sToday += '_';
    sToday += today.getHours().toString();
    sToday += '-';
    sToday += today.getMinutes().toString();
    sToday += '-';
    sToday += today.getSeconds().toString();
    return sToday;
}