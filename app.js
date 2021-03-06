var tress = require('tress');
var needle = require('needle');
var cheerio = require('cheerio');
var options = {
    compressed         : false, // sets 'Accept-Encoding' to 'gzip, deflate, br'
    follow_max         : 5,    // follow up to five redirects
}
var URL = [
    'https://www.smag.kz/'
];
var results = [];

// `tress` последовательно вызывает наш обработчик для каждой ссылки в очереди
var q = tress(function(url, callback){

    //тут мы обрабатываем страницу с адресом url
    needle.get(url, options, function(err, res, body){
        if (err) throw err;
        var $ = cheerio.load(body);
        var title = $("title").text();
        var description = $("meta[name='description']").attr('content');
        console.log(body)
        // здесь делаем парсинг страницы из res.body
        // делаем results.push для данных о новости
        // делаем q.push для ссылок на обработку

        callback(); //вызываем callback в конце
    });
}, 10);

// эта функция выполнится, когда в очереди закончатся ссылки
q.drain = function(){
    require('fs').writeFileSync('./data.json', JSON.stringify(results, null, 4));
}

// добавляем в очередь ссылку на первую страницу списка
q.push(URL);