var tress = require('tress');
var needle = require('needle');
var cheerio = require('cheerio');
var options = {
    compressed         : true, // sets 'Accept-Encoding' to 'gzip, deflate, br'
    follow_max         : 5,    // follow up to five redirects
}
var URL = [
    'https://avtotochka.su/form/3-zakazat-zvonok.html',
    'https://avtotochka.su/catalog-rental-car.html',
    'https://avtotochka.su/catalog-rental-car/catalog-business-rental-car.html',
    'https://avtotochka.su/catalog-rental-car/catalog-middle-rental-car.html',
    'https://avtotochka.su/catalog-rental-car/catalog-economy-rental-car.html',
    'https://avtotochka.su/rent-terms.html',
    'https://avtotochka.su/price.html',
    'https://avtotochka.su/faq.html',
    'https://avtotochka.su/blog.html',
    'https://avtotochka.su/contacts.html',
    'https://avtotochka.su/renault-logan-belyy.html',
    'https://avtotochka.su/renault-logan-siniy.html',
    'https://avtotochka.su/chevrolet-lacetti.html',
    'https://avtotochka.su/renault-logan-bronza-avtomat.html',
    'https://avtotochka.su/renault-sandero-stepway.html',
    'https://avtotochka.su/hyundai-solaris-hetchbek-serebro.html',
    'https://avtotochka.su/volkswagen-polo-belyy.html',
    'https://avtotochka.su/chevrolet-aveo-siniy.html',
    'https://avtotochka.su/chevrolet-aveo-chernyy.html',
    'https://avtotochka.su/blog/pochemu-arendovat-avto-modno-mnenie-ekspertov.html',
    'https://avtotochka.su/blog/novyj-god-2020-i-rozhdestvo-v-tule-kak-arendovat-avto-v-tule-na-novogodnie-prazdniki.html',
    'https://avtotochka.su/blog/puteshestvie-na-arendovannom-avtomobile-marshrut-po-tule-i-oblasti.html',
    'https://avtotochka.su/hyundai-solaris-cherno-seryy.html',
    'https://avtotochka.su/volkswagen-polo.html',
    'https://avtotochka.su/hyundai-solaris-belyy.html',
    'https://avtotochka.su/toyota-corolla.html',
    'https://avtotochka.su/hyundai-elantra.html',
    'https://avtotochka.su/hyundai-i40.html',
    'https://avtotochka.su/blog/kakimi-preimushchestvami-obladaet-arenda-bez-voditelya-v-tule.html',
    'https://avtotochka.su/blog/arenda-avto-v-tule.html',
    'https://avtotochka.su/blog/prokat-avtomobilej-bez-voditelya-v-tule-udobstvo-i-komfort-bez-granits.html',
    'https://avtotochka.su/blog/podrobnyj-gid-po-prokatu-mashin-v-tule.html',
    'https://avtotochka.su/blog/kak-vzyat-avto-naprokat-nedorogo.html',
    'https://avtotochka.su/blog/arenda-mashin-bez-voditelya-v-tule.html',
    'https://avtotochka.su/blog/top-3-preimushchestva-arendy-mashin-bez-voditelya.html',
    'https://avtotochka.su/index.php'
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