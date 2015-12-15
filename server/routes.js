/**
 * Created by Minhaj on 6/20/15.
 */

var tesseract = require('node-tesseract');
var textcleaner = require('textcleaner');
var multer  = require('multer');
var fs = require('fs');


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

module.exports = function(app) {
    app.use(multer(
        {
            dest: './.tmp/',
            inMemory: false
        }
    ));

    app.post("/api/ocr", process);
    app.post("/api/digits", digits);

};

/**
 * Following steps done under this functions.
 *
 * 1. Uploads image under '.tmp' folder.
 * 2. Grab text from image using 'tesseract-ocr'.
 * 3. Delete image from hardisk.
 * 4. Return text in json format.
 *
 * @param req
 * @param res
 */

 var digits = function(req, res) {

    console.log('connection : %j', req.files.image.path);

    var image = req.files.image.path;

    preprocessImage(image,function(err, preprocessedImage) {
        if(!err) {
            
            console.log('\nImage preprocessed! '+preprocessedImage);
            
            performOCR(preprocessedImage, function(err, text) {

                if (!err) {
                    res.json(200, text);
                    copyFileSync(image, __dirname + '/../uploads/'+datetimestamp()+'--'+text+'.jpg');
 
                } else {
                    res.json(500, "Error while scanning image");
                }
            });
        } 
    });
};

var process = function(req, res) {

    var path = req.files.file.path;

    preprocessImage(path,function(err, preprocessedImage) {
        if(!err) {
            
            console.log('\nImage preprocessed! '+preprocessedImage);
            
            performOCR(preprocessedImage, function(err, text) {

                if (!err) {
                    res.json(200, text);
                } else {
                    res.json(500, "Error while scanning image");
                }
            });
        } 
    });
};

function preprocessImage(path, callback) {
    textcleaner.process(path,function(err, preprocessedImage) {
        if(err) {
            console.error(err);
            callback(err,null);
        } else {
            callback(null,preprocessedImage);
        }
    });
}

function performOCR(path, callback) {

    // Recognize text of any language in any format
    tesseract.process(path,function(err, text) {
        if(err) {
            console.error(err);
        } else {
            // fs.unlink(path, function (err) {
            //     if (err){
            //         callback(err,null)
            //     }
            //     console.log('successfully deleted %s', path);
            // });

            text = text.replace(/\n/g, '');
            text = text.replace(/ /g,'')
            text = text.replace(/\./g,'')
            text = text.replace('"', '');
        
            callback(null, text);
        }
    });

}