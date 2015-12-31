/**
 * Created by Minhaj on 6/20/15.
 */

var utils = require('utils');
var tesseract = require('node-tesseract');
var textcleaner = require('textcleaner');
var multer  = require('multer');
var express  = require('express');
var fs = require('fs');
var hocr = require('node-hocr');
var Dropbox = require("dropbox");
var dropboxClient;

module.exports = function(app) {
    app.use(multer(
        {
            dest: './.tmp/',
            inMemory: false
        }
    ));

    app.post("/api/ocr", process);
    app.post("/api/digits", digits);
    app.get("/api/benchmark", benchmark);
    app.get("/server_check", server_check);


};

var getDropboxClient = function() {

    if (!dropboxClient) {
        dropboxClient = new Dropbox.Client({
            key: "mbwfmlzklm1fi1d",
            secret: "giazksdcfzo8u9g"
        });
    }

    dropboxClient.authDriver(new Dropbox.AuthDriver.NodeServer(8191));
    
    return dropboxClient;
}

var authenticateDropboxClient = function(callback) {
    var dbClient = getDropboxClient();
    dbClient.authenticate(function(error, client) {
      if (error) {
        callback(error, null);
      } else {
        callback(null, client);
      }
    });
}

var uploadFileToDropbox = function(image, filename, callback) {
    authenticateDropboxClient(function(error, client) {

        console.log(error);
        console.log(client);

        fs.readFile(image, function(frerror, data) {
          // No encoding passed, readFile produces a Buffer instance
          if (frerror) {
             callback(frerror, null);
             return;
          }

          client.writeFile(filename, data, function(dberror, stat) {
             callback(dberror, stat);
             return;
          });
        });
    });
}

var server_check = function(req,res) {

    tesseract.version(function(err, data) {
        if (!err) {
            res.json(200, data); 
        } else {
            res.json(500, err);
        }
    });
}

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

 var benchmark = function(req, res) {

    var expect = 9373;

    var image = __dirname + '/../test/test_5.jpg';

    //best for dark 04944 : 
    // b_0.6_c_-0.1_p_4  49445774
    // b_0.6_c_0.6_p_4  0494411
    // b_0.6_c_0.5_p_4  04944152
    // b_0.7_c_0.4_p_5_ 0494415

    //best for dark 019676
    // b_0.6_c_0.8_p_5_01967931

    //best for medium 21138 : 
    // b_0.4_c_0.8_p_5_1388
    // b_0.4_c_0.8_p_5_1388.jpg
    // b_0.4_c_0.85_p_15_8138


    for (var p=5;p<=5;p+=1) {
        for (var b=-30;b<=90;b+=10) {
            for (var c=0; c<=100;c+=10) {

            preprocessImageWithParams(image, b/100, c/100,p,function(err, isLcd, preprocessedImage, br, co, po) {
                if(!err) {
                        performOCR(preprocessedImage, isLcd, function(err, text) {
                            if (parseInt(text) != expect) {
                                utils.copyFileSync(preprocessedImage, __dirname + '/../uploads/meter_photo_b_'+br+'_c_'+co+'_p_'+po+'_'+text+'.jpg');
                            } else {
                                utils.copyFileSync(preprocessedImage, __dirname + '/../uploads/YES_meter_photo_b_'+br+'_c_'+co+'_p_'+po+'_'+text+'.jpg');
                            }

                            fs.unlink(preprocessedImage, function (err) {
                                if (err){
                                    callback(err,null)
                                }
                            });
                        });
                    }
                });
            }
        }
    }
    res.json(200, 'started');
 }

 var digits = function(req, res) {

    console.log('Start processing: %j', req.files.image.path);

    var crop = req.body.crop;

    if (!crop) {
        console.err("Please put 'crop' parameter into POST request");
        return;
    }

    var cropRect = new utils.Rect(crop);  
    var image = req.files.image.path;
    performOcrForImage(image,cropRect,req,res);
};

var process = function(req, res) {
    var image = req.files.file.path;
    performOcrForImage(image, null, req, res);
};

function performOcrForImage(image, cropRect, req,res ) {
 
    //create copy of original image
    preprocessImage(image,cropRect,function(preprocessedImages) {
        
        if (preprocessedImages == null) {
            res.json(200, "");     
        }

        console.log('\nImage preprocessed: '+preprocessedImages.length+'\n');
        
        var hocrs = [];
        var results = [];
        var ocrDone = 0;

        for (var index = 0; index < preprocessedImages.length; index++) {

            var stepImage = preprocessedImages[index];

            performOCR(stepImage.path, stepImage.isLcd, function(err, text) {

                ocrDone++;

                if (text != null) {
                    hocrs.push(text);
                }    

                if (ocrDone == preprocessedImages.length) {

                    parseNextHocr(hocrs,0, results, function(endResults) {
                        
                        var winner;

                        if (endResults != null) { 
                            console.log("\nCandidates:");
                            endResults.forEach(logArrayElements);

                            var maxConfidence = Math.max.apply(Math,endResults.map(function(o){ 
                                if (o == null) return 0;
                                return o.confidence; 
                            }));

                            var winners = endResults.filter(function (o) {

                                if (o == null) {
                                    return false;
                                }

                                return o.confidence == maxConfidence;
                            });

                            console.log("\nWinners:");
                            console.log(winners);

                            winner = winners[0];
                        }

                        if (winner == null) {
                            winner = new utils.MeterRead("",0);
                        }

                        var filename = 'meter_photo_'+utils.datetimestamp()+'-original-'+winner.word+'.jpg';
                        utils.copyFileSync(image, __dirname + '/../uploads/'+filename);
                        res.json(200, meterReadToJson(winner));

                        uploadFileToDropbox(image,filename,function(error, stats) {

                            console.log(error);
                            console.log(stats);

                            fs.unlink(image, function (err) {
                                if (err){
                                    callback(err,null)
                                }
                            });
                        });
                    });
                }
            });
        } 
    });
}

function preprocessImage(path, cropRect, callback) {
    textcleaner.process(path, cropRect,function(preprocessedImages) {
        callback(preprocessedImages);
    });
}

function preprocessImageWithParams(path, b, c,p, callback) {
    textcleaner.benchmark(path, b, c, p,function(err, isLcd, preprocessedImage) {
        if(err) {
            console.error(err);
            callback(err,isLcd,null, b, c, p);
        } else {
            callback(null,isLcd, preprocessedImage, b, c,p);
        }
    });
}

function meterReadFromData(data) {

    if (data.length == 0) return null;
    if (data[0].par.length == 0) return null;
    if (data[0].par[0].line.length == 0) return null;
    if (data[0].par[0].line[0].words.length == 0) return null;

    var words = data[0].par[0].line[0].words;
    console.log(words);

    var totalConfidence = 0;
    var totalCounter = 0;
    var fullWord = "";

    for (var index=0; index <words.length; index++) {

            var word = words[index];
            var singleWord = word.data;
            if (singleWord != null) {
                singleWord = singleWord.replace(/\n/g, '');
                singleWord = singleWord.replace(/ /g,'')
                singleWord = singleWord.replace(/\./g,'')
                singleWord = singleWord.replace('"', '');
                singleWord = singleWord.replace(/-/g, '');
            }

            if (singleWord != null) {
                fullWord = fullWord + singleWord;
            }

            if (word != null) {
                var params = word.infos.split("x_wconf");
                var confidence = params[1];
                confidence = confidence.replace(/ /g,'');
                totalConfidence += parseInt(confidence);
                totalCounter++;
            }
    }
    
    if (totalCounter > 0) {
        totalConfidence = totalConfidence / totalCounter;
    }
 
    var meterRead = new utils.MeterRead(fullWord,totalConfidence);
    return meterRead;
}

function meterReadToJson(meterRead) {
    return {"meter_read": meterRead.word, "confidence": meterRead.confidence.toFixed(2)};
}

function parseNextHocr(hocrs, index, results, callback) {

        if (index >= hocrs.length) {
            callback(results);
            return;
        }

        console.log("Current step of parsing: "+index);

        parseHocr(hocrs[index],function(err,image) {

            if (err == null) {
                results.push(image);
            }

            parseNextHocr(hocrs, index+1, results,callback);
        });
 }

 function parseHocr(hocr_value, callback) {

   var hocr2 = new hocr.Hocr(hocr_value, function(error, data) {
        if (error) {
          callback(error, null);
        } else {
          var meterRead = meterReadFromData(data);
          callback(null, meterRead);
        }
   });
}

function logArrayElements(element, index, array) {
    if (element == null) return;
    console.log('"'+element.word+'" = ' + element.confidence + '%');
}

function performOCR(path, isLcd, callback) {

    // Recognize text of any language in any format
    tesseract.process(path,isLcd,function(err, text) {
        if(err) {
            console.error(err);
        } else {
            callback(null, text);
        }
    });

}