var express = require('express'),
    fs = require('fs'),
    app = express();

var tress = require('tress');
var needle = require('needle');
var cheerio = require('cheerio');
var bodyParser = require('body-parser');
var options = {
    compressed         : true, // sets 'Accept-Encoding' to 'gzip, deflate, br'
    follow_max         : 5,    // follow up to five redirects
}
var app = express();

var ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', function(req, res) {
    res.send('API for extraction titles');
});

// get all find urls
app.post('/api/v1/find-urls', (req, res) => {
    res.status(200).send({
        success: 'true',
        message: 'find-urls',
    })
});

app.post('/api/v1/find-urls2', function(req, res) {
    res.status(200).send({data:req.body}); // will give { name: 'Lorem',age:18'} in response
});

app.post('/api/v1/extract-data', (req, res) => {
    var results = [];
    var URL = JSON.parse(req.body.urls);
    var q = tress(function(url, callback){

        //тут мы обрабатываем страницу с адресом url
        needle.get(url, options, function(err, res, body){
            if (err) throw err;
            var $ = cheerio.load(body);
            var title = $("title").text();
            var description = $("meta[name='description']").attr('content');
            results.push({title: title, description: description, url: url});

            callback(); //вызываем callback в конце
        });
    }, 10);
    // эта функция выполнится, когда в очереди закончатся ссылки
    q.drain = function(){
        res.status(200).send(JSON.stringify(results));
    }

// добавляем в очередь ссылку на первую страницу списка
    q.push(URL);

});

app.listen(8080, ip);

module.exports = app;