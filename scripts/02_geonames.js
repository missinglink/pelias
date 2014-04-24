
var fs = require('fs'),
    request = require('request'),
    unzip = require('unzip'),
    csv = require('csv'),
    esclient = require('../esclient');

var columns = [
  '_id','name','asciiname','alternatenames','latitude','longitude','feature_class',
  'feature_code','country_code','cc2','admin1_code','admin2_code','admin3_code',
  'admin4_code', 'population','elevation','dem','timezone','modification_date'
];

var source = fs.existsSync('data/geonames/allCountries.zip')
  ? fs.createReadStream('data/geonames/allCountries.zip')
  : request.get('http://download.geonames.org/export/dump/allCountries.zip');

source
  .pipe(unzip.Parse())
  .on('entry', function (entry) {
    entry.pipe(
      csv()
        .from.options({
          columns: columns,
          delimiter: '\t',
          quote: null,
          trim: true
        })
        .transform(function (data) {
          return JSON.stringify({
            _index: 'pelias',
            _type: 'geoname',
            _id: data._id,
            data: data
          });
        })
    )
    .pipe(esclient.stream)
  });
