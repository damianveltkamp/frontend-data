const fetch = require('node-fetch')

export async function getFeatures(fetchUrl) {
    const features = await fetchData(fetchUrl)
    return features
}

async function fetchData(fetchUrl) {
    const rawData = await fetch(fetchUrl)
    const json = await rawData.json()
    return json
}