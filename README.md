# Pelias

[![Build Status](https://secure.travis-ci.org/mapzen/pelias.png)](http://travis-ci.org/mapzen/pelias)

Pelias is a set of tools for importing [OpenStreetMap](http://www.openstreetmap.org/) data into [Elasticsearch](http://www.elasticsearch.org/), and a simple server to handle queries and autocomplete suggestions.

## Requirements

* _PostgreSQL_: You'll need a postGIS-enabled database with OpenStreetMap data, imported with [osm2pgsql](http://wiki.openstreetmap.org/wiki/Osm2pgsql).
  NOTE: The import process expects certain fields, so you'll need to use the style file here: config/osm2pgsql.style
* _Elasticsearch_: For Search download the latest version of [Elasticsearch](http://www.elasticsearch.org/download/)
* _Redis_: Geonames lookup for quattroshapes cross-referencing
* _Sidekiq_: Used for background processing (also uses Redis)
* Ruby 2

## Usage

To get set up, run the following.

### Get the code and bundle to download dependencies

    $ git clone git@github.com:mapzen/pelias.git
    $ bundle

### Set up the index & mappings:

    $ rake index:create

### Prepare geonames

Geonames provide nice alternative names and populations for locations.  We
cross-reference this data with quattroshapes in the next step in order to
provide a better search experience.

    $ rake geonames:populate

### Insert quattroshapes

These are shapes for various administrative shapes. They are provided by the
http://quattroshapes.com/ project.

NOTE: These tasks are enqueued via Sidekiq and must be run in isolated steps.
You can run them inline by using the environment variable `ES_INLINE=1`.

    $ rake quattroshapes:prepare_all
    $ rake quattroshapes:populate_admin0
    $ rake quattroshapes:populate_admin1
    $ rake quattroshapes:populate_admin2
    $ rake quattroshapes:populate_local_admin
    $ rake quattroshapes:populate_locality
    $ rake quattroshapes:populate_neighborhood

### Add OSM data

Assuming you've set up a postGIS-enabled database with OSM data, the following
will add all streets and addresses to the index, reverse geocoding them into
the above shapes.

    $ rake osm:populate_street
    $ rake osm:populate_address
    $ rake osm:populate_poi

## Start the server

    $ unicorn

You should now be able to access the server at http://localhost:8080/suggest?query=bro

## Production-like Setup Performance Information

To give you an idea of what you're getting into, we provide the following
synopsis of an environment purpose built for the loading of this data. In
addition, rough times to complete each step, along with what the end product
will look like in terms of amount of data, number of documents, etc.

### Architecture/Tuning

* PostgreSQL/PostGIS: 1 c3.8xlarge
* Elasticsearch: 4 c3.4xlarge
* Sidekiq: 4 c1.medium

Using this hardware allocation, we also recommend the following during the initial data load:
* disable replication in elasticsearch: `curl -s -XPUT http://localhost:9200/_settings -d "{\"index\": {\"number_of_replicas\" : \"0\"}}"`
* set the index refresh interval to something north of 60 seconds: `curl -s -XPUT http://localhost:9200/_settings -d "{\"index\": {\"refresh_interval\" : \"3600s\"}}"`
* in PostgreSQL, add the following index (this will take some time if you're working with a full planet installation): `CREATE INDEX limit_street_line ON planet_osm_line (name, highway);`

### Load Times

Using the above architecture, we've observed the following load times:
* `rake quattroshapes:prepare_all` ~ 1.5 hours. Load on Elasticsearch is generally near 100% CPU with a 5 minute load average of 14 (the c3.4xlarge instances provide 16 cores)
* `rake quattroshapes:populate_all`
* `rake geonames:populate`
* `rake osm:populate_street`
* `rake osm:populate_address`

## API

### search

This is our search endpoint.  This is used to search the index for addresses,
POIs, etc.

```
/search?query=brooklyn
/search?query=brooklyn&center=-74.08,40.77
/search?query=brooklyn&viewbox=-74.08,40.77,-73.9,40.67
/search?query=brooklyn&viewbox=-74.08,40.77,-73.9,40.67
```

### suggest

This is an autocomplete suggestion endpoint.  It provides search suggestions
given text to look up.

```
/suggest?query=bro
/suggest?query=bro&size=5
```

### reverse

This is the reverse geocoding endpoint.  It takes `lng` and `lat` params and
returns GeoJSON corresponding to the given location.

```
/reverse?lng=1&lat=2
```

## Demo

Check out our demo here: [http://mapzen.com/pelias](http://mapzen.com/pelias)

## LICENSE

MIT License.  See included `LICENSE`
