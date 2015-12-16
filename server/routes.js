/**
 * Created by Minhaj on 6/20/15.
 */

var utils = require('utils');
var tesseract = require('node-tesseract');
var textcleaner = require('textcleaner');
var multer  = require('multer');
var fs = require('fs');

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

 var benchmark = function(req, res) {

    var expect = 019676;

    var image = __dirname + '/../test/test_3.jpg';

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

            preprocessImageWithParams(image, b/100, c/100,p,function(err, preprocessedImage, br, co, po) {
                if(!err) {
                        performOCR(preprocessedImage, function(err, text) {
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

    //create copy of original image
    preprocessImage(image,cropRect,function(err, preprocessedImage) {
        if(!err) {
            
            console.log('\nImage preprocessed! \n'+preprocessedImage+'\n');
            
            performOCR(preprocessedImage, function(err, text) {

                if (!err) {
                    res.json(200, text);
                    utils.copyFileSync(image, __dirname + '/../uploads/meter_photo_'+utils.datetimestamp()+'-original-'+text+'.jpg');
 
                    fs.unlink(image, function (err) {
                        if (err){
                            callback(err,null)
                        }
                    });

                } else {
                    res.json(500, "Error while scanning image");
                }
            });
        } 
    });
};

var process = function(req, res) {

    var path = req.files.file.path;

    preprocessImage(path,null,function(err, preprocessedImage) {
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

function preprocessImage(path, cropRect, callback) {
    textcleaner.process(path, cropRect ,function(err, preprocessedImage) {
        if(err) {
            console.error(err);
            callback(err,null);
        } else {
            callback(null,preprocessedImage);
        }
    });
}

function preprocessImageWithParams(path, b, c,p, callback) {
    textcleaner.benchmark(path, b, c, p,function(err, preprocessedImage) {
        if(err) {
            console.error(err);
            callback(err,null, b, c, p);
        } else {
            callback(null,preprocessedImage, b, c,p);
        }
    });
}


function performOCR(path, callback) {

    // Recognize text of any language in any format
    tesseract.process(path,function(err, text) {
        if(err) {
            console.error(err);
        } else {
        
            text = text.replace(/\n/g, '');
            text = text.replace(/ /g,'')
            text = text.replace(/\./g,'')
            text = text.replace('"', '');
            text = text.replace(/-/g, '');
    
            callback(null, text);
        }
    });

}