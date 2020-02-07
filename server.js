var express = require('express'),
    fs = require('fs'),
    app = express();

var tress = require('tress');
var needle = require('needle');
var cheerio = require('cheerio');
var options = {
    compressed         : true, // sets 'Accept-Encoding' to 'gzip, deflate, br'
    follow_max         : 5,    // follow up to five redirects
}
var app = express();

var ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';

var URL = [
    'https://avtotochka.su/form/3-zakazat-zvonok.html',
    'https://avtotochka.su/catalog-rental-car.html'
];
var results = [];
app.get('/', function(req, res) {
    res.send('API for extraction titles');
});

// get all find urls
app.get('/api/v1/find-urls', (req, res) => {
    res.status(200).send({
        success: 'true',
        message: 'find-urls',
    })
});


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
app.get('/api/v1/extract-data', (req, res) => {
    // эта функция выполнится, когда в очереди закончатся ссылки
    q.drain = function(){
        res.status(200).send(JSON.stringify(results));
    }

// добавляем в очередь ссылку на первую страницу списка
    q.push(URL);

});

app.listen(8080, ip);

module.exports = app;