var express = require('express'),
    fs = require('fs'),
    app = express();

var tress = require('tress');
var needle = require('needle');
var cheerio = require('cheerio');
var bodyParser = require('body-parser');
var timeout = require('connect-timeout');
var pretty = require('html');
var h2p = require('html2plaintext');
var options = {
    compressed         : false, // sets 'Accept-Encoding' to 'gzip, deflate, br'
    follow_max         : 5,    // follow up to five redirects
}
var app = express();

var ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', function(req, res) {
    res.send('API for extraction titles');
});

app.post('/api/v1/extract', (req, res) => {
    var results = [];
    var URL = req.body.urls;
    var q = tress(function(url, callback){

        //тут мы обрабатываем страницу с адресом url
        needle.get(url, options, function(err, res, body){
            if (err) throw err;
            body = body.replace(/<\!--.*?-->/gs, "");
            body = body.replace(/<noscript>.*?<\/noscript>/gs, "");
            body = pretty.prettyPrint(body);
            var text = h2p(body);
            text = text.replace(/-\s/gs, "");
            // text = text.replace(/\[(.*?)\]/gs, "");
            text = text.replace(/[,?!:;()"*']/gs, " ");

            var words = countWords(text.toLowerCase());
            var word_count = Object.values(words).reduce((a, b) => a + b, 0)
            var $ = cheerio.load(body);
            var title = $("title").text();
            var description = $("meta[name='description']").attr('content') || '';
            results.push({
                url: url,
                title: title,
                description: description,
                words: words,
                wordcount: word_count
            });

            callback(); //вызываем callback в конце
        });
    }, 10);
    // эта функция выполнится, когда в очереди закончатся ссылки
    q.drain = function(){
        res.status(200).json(JSON.stringify(results));
    }

// добавляем в очередь ссылку на первую страницу списка
    q.push(URL);

});


var server = app.listen(8080, ip);
module.exports = app;
function countWords(sentence) {
    var index = {},
        words = sentence
            .replace(/\s+/gs, " ")
            .split(" ");

    words.forEach(function (word) {
        word = word.replace(/[^0-9a-zA-ZаАбБвВгГдДеЕёЁжЖзЗиИйЙкКлЛмМнНоОпПрРсСтТуУфФхХцЦчЧшШщЩъЪыЫьЬэЭюЮяЯ-]/gi, "");
        if(word!='') {
            if (!(index.hasOwnProperty(word))) {
                index[word] = 0;
            }
            index[word]++;
        }
    });

    return index;
}