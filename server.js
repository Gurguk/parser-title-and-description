var express = require('express'),
    fs = require('fs'),
    app = express();
var parseurl = require('url');
var tress = require('tress');
var needle = require('needle');
var cheerio = require('cheerio');
var bodyParser = require('body-parser');
var timeout = require('connect-timeout');
var pretty = require('html');
var h2p = require('html2plaintext');
var createHtmlDom = require('htmldom');
var XRegExp = require('xregexp');
needle.defaults({
    open_timeout: 40000,
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36'
});

var options = {
    compressed         : false, // sets 'Accept-Encoding' to 'gzip, deflate, br'
    follow_max         : 5,    // follow up to five redirects
    rejectUnauthorized : false
}
var app = express();

var ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', function(req, res) {
    res.send('API for extraction titles');
});

app.post('/api/v1/extract_urls', (req, res) => {
    var results = [];
    var URL = req.body.url;
    var parse  = parseurl.parse(URL);
    var push_id = 1;
    var q = tress(function(url, callback){
        //тут мы обрабатываем страницу с адресом url
        if(decodeURI(url)==url && encodeURI(url)!=url) {
            url = encodeURI(url);
        }
        needle.get(url, options, function(err, res, body){
            if (err) throw err;
            if(typeof body!=="object") {
                body = body.replace(/<\!--.*?-->/gs, "");
                body = body.replace(/<noscript>.*?<\/noscript>/gs, "");
                var $ = cheerio.load(body);
                var links = $("a");

                $(links).each(function (i, link) {
                    if ($(link).attr('rel') == 'nofollow')
                        return;
                    var href = $(link).attr('href');

                    if (href === undefined) {
                        return;
                    }
                    var extension = href.split('.').pop().toLowerCase();
                    var extensions = ["gif", "jpg", "jpeg", "png", "tiff", "tif", "mp3", "mpeg", "flv", "mov", "3gp", "avi", "ogg", "vob", "doc", "docx", "djvu", "fb2", "pdf", "rss"];
                    if (extensions.indexOf(extension) !== -1) {
                        return;
                    }
                    if (href == '/') {
                        href = parse.protocol + '//' + parse.hostname;
                    }
                    if (href.indexOf('//') === 0) {
                        return;
                    }
                    if (href.indexOf(':') !== -1) {
                        var p = parseurl.parse(href);
                        if (p.hostname != parse.hostname && 'www.' + p.hostname != parse.hostname && p.hostname != 'www.' + parse.hostname) {
                            return;
                        }
                    }
                    if (href.indexOf('http') === -1) {
                        if (href.indexOf('/') === 0) {
                            href = parse.protocol + '//' + parse.hostname + href;
                        } else {
                            href = parse.protocol + '//' + parse.hostname + '/' + href;
                        }
                    }
                    if (results === undefined)
                        results = [];
                    href = href.split('#')[0];
                    href = href.split('?')[0];
                    if (href.charAt(href.length - 1) == '/') {
                        href = href.substring(0, href.length - 1)
                    }
                    if (href != '')
                        results.push(href);
                });
                results = results.filter(onlyUnique);

                if (results.length < 500 && push_id < 25 && results[push_id] !== undefined) {
                    q.push(results[push_id]);
                    push_id++;
                }
            }
            callback(); //вызываем callback в конце
        });
    }, 5);
    // эта функция выполнится, когда в очереди закончатся ссылки
    q.drain = function(){
        res.status(200).json(JSON.stringify(results));
    }

// добавляем в очередь ссылку на первую страницу списка
    q.push(URL);
});

app.post('/api/v1/extract', (req, res) => {
    var results = [];
    var URL = req.body.urls;
    var q = tress(function(url, callback){
        //тут мы обрабатываем страницу с адресом url
        if(decodeURI(url)==url && encodeURI(url)!=url) {
            url = encodeURI(url);
        }
        needle.get(url, options, function(err, res, body){
            if (err) throw err;
            if(typeof body!=="object") {
                body = body.replace(/<\!--.*?-->/gs, "");
                body = body.replace(/<noscript>.*?<\/noscript>/gs, "");
                body = body.replace(/<script([\S\s]*?)>([\S\s]*?)<\/script>/ig, "");
                body = body.replace(/<style([\S\s]*?)>([\S\s]*?)<\/style>/ig, "");
                var $ = createHtmlDom(body);
                body = $.beautify({
                    indent: '  '
                });
                // body = pretty.prettyPrint(body);
                var text = h2p(body);
                var symbols_count_without_space = text.replace(/\s/gs, '').length;

                var symbols_count= text.replace(/\s{2,}/gs, ' ').length;
                text = text.replace(/-\s/gs, "");
                // text = text.replace(/\[(.*?)\]/gs, "");
                text = text.replace(/[,?!:;()"*']/gs, " ");

                var words = countWords(text.toLowerCase());
                var word_count = Object.values(words).reduce((a, b) => a + b, 0)
                var $ = cheerio.load(body);
                var title = $("title").text();
                var description = $("meta[name='description']").attr('content') || '';
                var nosnippets = $("meta[name='robots']").attr('content') || '';
                results.push({
                    url: url,
                    title: title.replace(/\s{2,}/gs, ' '),
                    description: description.replace(/\s{2,}/gs, ' '),
                    nosnippets: nosnippets,
                    words: words,
                    wordcount: word_count,
                    symbolscountws: symbols_count_without_space,
                    symbolscount: symbols_count
                });
            }

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

app.post('/api/v1/extract_html', (req, res) => {
    var results = '';
    var URL = req.body.url;
    var q = tress(function(url, callback){
        //тут мы обрабатываем страницу с адресом url
        if(decodeURI(url)==url && encodeURI(url)!=url) {
            url = encodeURI(url);
        }
        needle.get(url, options, function(err, res, body){
            if (err) throw err;
            results = body;
            callback(); //вызываем callback в конце
        });
    }, 5);
    // эта функция выполнится, когда в очереди закончатся ссылки
    q.drain = function(){
        // res.status(200).json(JSON.stringify(results));
        res.send(results);
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
        var regex = new XRegExp("[^\\p{L}\\p{N}\\s-]","gi");
        word = XRegExp.replace(word, regex, "");
        // word = word.replace(/[^0-9a-zA-ZаАбБвВгГдДеЕёЁжЖзЗиИйЙкКлЛмМнНоОпПрРсСтТуУфФхХцЦчЧшШщЩъЪыЫьЬэЭюЮяЯ-]/gi, "");
        if(word!='') {
            if (!(index.hasOwnProperty(word))) {
                index[word] = 0;
            }
            index[word]++;
        }
    });

    return index;
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}