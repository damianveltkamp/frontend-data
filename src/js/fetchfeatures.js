const fetch = require('node-fetch')

export async function getFeatures(fetchUrl) {
    const features = await fetchData(fetchUrl)
        .then(data => processData(data))
    return features
}

async function fetchData(fetchUrl) {
    const rawData = await fetch(fetchUrl)
    const json = await rawData.json()
    return json
}

function processData(data) {
    const everyCountry = [...new Set(data.features.map(feature =>
        feature.properties.country
    ))]
    const featureArray = []
    everyCountry.forEach(land => {
        let newObj = new Object()
        data.features.filter(data => {
            if(data.properties.country === land) {
                if(newObj.country) {
                    newObj.amount += 1
                } else {
                    newObj.country = data.properties.country
                    newObj.amount = 1
                    newObj.coordinates = data.geometry.coordinates
                }
            }
        })
        featureArray.push(newObj = {
            featureObj: newObj,
        })
    })
    return featureArray
}