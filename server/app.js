/**
 * Created by Minhaj on 6/20/15.
 */

var serveIndex = require('serve-index');
var express = require('express')
    ,app = express();

app.use("/images", express.static(__dirname + '/../uploads'));
app.use("/images",serveIndex(__dirname + '/../uploads', {'icons': true}));
app.use(express.static('public'));

// logs every request
app.use(function(req, res, next){
    // output every request in the array
    console.log({method:req.method, url: req.url, device: req.device});

    // goes onto the next function in line
    next();
});

 
require('./routes')(app);


var runningPortNumber = process.env.PORT || 8080;

var server = app.listen(runningPortNumber, function () {

    var host = server.address().address;
    var port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port);

});