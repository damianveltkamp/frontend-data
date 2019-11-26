const fetch = require('node-fetch')
const fs = require('fs')

const settings = {
    apiUrl: 'https://api.data.netwerkdigitaalerfgoed.nl/datasets/ivo/NMVW/services/NMVW-26/sparql',
    query: `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX edm: <http://www.europeana.eu/schemas/edm/>
PREFIX dc: <http://purl.org/dc/elements/1.1/>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX wgs84: <http://www.w3.org/2003/01/geo/wgs84_pos#>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX gn: <http://www.geonames.org/ontology#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?cho ?wapenType ?landName ?lat ?long WHERE {
   <https://hdl.handle.net/20.500.11840/termmaster12435> skos:narrower* ?type .
   ?cho edm:object ?type .
   ?cho dc:type ?wapenType .
   ?cho dct:spatial ?place .
   ?place skos:exactMatch/gn:parentCountry ?land .
   ?land gn:name ?landName . 
   ?land wgs84:lat ?lat .
   ?land wgs84:long ?long
} limit 50000`,
    outputPath: 'dist/data/output/',
    outputFileName: 'geoJsonData'
}

async function fetchdata(apiUrl, query) {
    const rawData = await fetch(apiUrl + '?query=' + encodeURIComponent(query) + '&format=json')
    const json = await rawData.json()
    return json
}

const geoJson = {
    type: 'FeatureCollection',
    features: []
}

fetchdata(settings.apiUrl, settings.query)
    .then(data => processData(data))
    .then(() => {
        const everyCountry = [...new Set(geoJson.features.map(feature =>
            feature.properties.country
        ))]
        const featureArray = []
        everyCountry.map(country => {
            // Create new new objects for feature and weapons
            let weaponObj = new Object()
            let featureObj = new Object()

            geoJson.features.map(data => {
                if(data.properties.country === country) {
                    // TODO shorthand schrijven
                    if (weaponObj[data.properties.weapontype] != null) {
                        weaponObj[data.properties.weapontype] += 1
                    } else {
                        weaponObj[data.properties.weapontype] = 1
                    }

                    if(featureObj.country) {
                        featureObj.amount += 1
                    } else {
                        featureObj.country = data.properties.country
                        featureObj.amount = 1
                        featureObj.coordinates = data.geometry.coordinates
                    }
                }
            })
            featureArray.push(bundledObj = {
                featureObj: featureObj,
                weaponObj: weaponObj
            })
        })
        writeData(featureArray)
    })

function processData(data) {
    data.results.bindings
        .map(convertToFeatureObject)
        .map(pushFeatures)
    return data
}
function convertToFeatureObject(item) {
    const feature = {
        type: 'Feature',
        properties: {
            // Add extra properties to the feature here i.e. Popups
            country: item.landName.value,
            weapontype: filterWeaponTypes(item)
        },
        geometry: {
            type: 'Point',
            coordinates: [
                parseFloat(item.long.value),
                parseFloat(item.lat.value)
            ]
        }
    }
    return feature
}

function filterWeaponTypes(item) {
    let string = item.wapenType.value.toLowerCase().trim()

    string.includes('bundel')
    || string.includes('model')
    || string.includes('werktuig')
    || string.includes('slinger')
    || string.includes('kostuum')
    || string.includes('vlechtwerk')
    || string.includes('landbouwgereedschap')
    || string.includes('kostuumset bruidegom')
    || string.includes('speelgoed')
    || string.includes('koker') ? string = 'unknown' : ''

    string.includes('pijl')
    || string.includes('katapult')
    || string.includes('boog') ? string = 'spangeschut' : ''

    string.includes('knots')
    ||    string.includes('schild')
    ||    string.includes('steen')
    ||    string.includes('degen')
    ||    string.includes('stok')
    ||    string.includes('staf')
    ||    string.includes('dolk')
    ||    string.includes('kris')
    ||    string.includes('drietand')
    ||    string.includes('bijl')
    ||    string.includes('knuppel')
    ||    string.includes('schede')
    ||    string.includes('mes')
    ||    string.includes('zijtand')
    ||    string.includes('zwaard')
    ||    string.includes('ploertendoder') ? string = 'handwapens' : ''

    string.includes('speer')
    ||    string.includes('harpoen')
    ||    string.includes('werp')
    ||    string.includes('lans')
    ||    string.includes('assegaai')
    ||    string.includes('lasso')
    ||    string.includes('bola') ? string = 'werpwapen' : ''

    string.includes('kanon')
    ||    string.includes('draaibas')
    ||    string.includes('wapen')? string = 'kannonen' :  ''

    string.includes('geweer')
    ||    string.includes('donderbus')
    ||    string.includes('pistool')
    ||    string.includes('revolver')? string = 'vuurwapens' :  ''

    string.includes('tempelattribuut') ? string = 'ceremonieel' : ''

    return string
}

function pushFeatures(item) {
    try {
        geoJson.features.push(item)
    } catch(err) {
        console.log(err)
    }
}

function writeData(data, fileIndex = 0) {
    fs.writeFile(settings.outputPath + settings.outputFileName +"_"+ fileIndex +".json",
        JSON.stringify(data,null,4),
        { encoding: 'utf8', flag: 'wx'},
        function(err) {
            if (err && err.code == "EEXIST") {
                writeData(data, ++fileIndex)
            } else if (err) {
                return console.log(err)
            } else {
                console.log("The file was saved!")
            }
        })
}