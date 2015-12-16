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