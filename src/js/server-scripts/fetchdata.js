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
        console.log(geoJson.features)
        const everyWeaponcategory = [...new Set(geoJson.features.map(feature =>
            feature.properties.weapontype[0].category
        ))]
        const featureArray = []
        everyCountry.map(country => {
            let featureObj = new Object()
            // let weaponObj = new Object()
            let weaponArray = []
            everyWeaponcategory.forEach((category) => {
                weaponArray.push({categoryname: category, amount: 0, weaponnames: []})
            })
            geoJson.features.map(data => {
                if(data.properties.country === country) {
                    const index = weaponArray.findIndex((weapon) => {
                        return weapon.categoryname == data.properties.weapontype[0].category
                    })
                    weaponArray[index].amount += 1
                    if(weaponArray[index].weaponnames.length == 0) {
                        data.properties.weapontype[1].amount = 1
                        weaponArray[index].weaponnames.push(data.properties.weapontype[1])
                    } else {
                        const foundindex = weaponArray[index].weaponnames.findIndex((weaponname) => {
                            return weaponname.weaponname == data.properties.weapontype[1].weaponname
                        })
                        if(foundindex == -1) {
                            data.properties.weapontype[1].amount = 1
                            weaponArray[index].weaponnames.push(data.properties.weapontype[1])
                        } else {
                            weaponArray[index].weaponnames[foundindex].amount += 1
                        }
                    }
                    if(featureObj.country) {
                        featureObj.amount += 1
                    } else {
                        featureObj.country = data.properties.country
                        featureObj.amount = 1
                        featureObj.coordinates = data.geometry.coordinates
                        featureObj.flag = false
                    }
                }
            })
            featureArray.push(bundledObj = {
                featureObj: featureObj,
                weaponObj: weaponArray
            })
        })
        // writeData(featureArray)
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
            weapontype: filterWeaponTypes(item),
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
    let string2 = item.wapenType.value.toLowerCase().trim()

    string.includes('bundel')
    || string.includes('model')
    || string.includes('werktuig')
    || string.includes('slinger')
    || string.includes('kostuum')
    || string.includes('vlechtwerk')
    || string.includes('landbouwgereedschap')
    || string.includes('kostuumset bruidegom')
    || string.includes('speelgoed')
    || string.includes('tempelattribuut')
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

    string.includes('geweer')
    ||    string.includes('donderbus')
    ||    string.includes('pistool')
    ||    string.includes('draaibas')
    ||    string.includes('kanon')
    ||    string.includes('wapen')
    ||    string.includes('revolver')? string = 'vuurwapens' :  ''

    string2.includes('pijl') ? string2 = 'pijl' : ''
    string2.includes('koker') ? string2 = 'koker' : ''
    string2.includes('boog') ? string2 = 'boog' : ''
    string2.includes('speer') ? string2 = 'speer' : ''
    string2.includes('lans') ? string2 = 'lans' : ''
    string2.includes('bijl') ? string2 = 'bijl' : ''
    string2.includes('kanon') ? string2 = 'kanon' : ''
    string2.includes('kostuum') ? string2 = 'unidentified' : ''
    string2.includes('tempel') ? string2 = 'unidentified' : ''
    string2.includes('pistool') ? string2 = 'pistool' : ''
    string2.includes('geweer') ? string2 = 'geweer' : ''
    return [{category: string, amount: 0}, {weaponname: string2, amount: 0}]
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